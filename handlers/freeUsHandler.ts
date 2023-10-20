import { APIGatewayProxyResult } from "aws-lambda";
import middy from "middy";
import { ssm } from "middy/middlewares";
import { Root, SchoolConfig } from "../types";
import {
  cancelAlert,
  checkVendorExists,
  clearPosition,
  getCurrentAlerts,
  getDeviceDetail,
  handleStartAlert,
  login,
  setRoomStatus,
  updatePosition,
} from "../utils";
import awsSdk from "aws-sdk";

const secretsManager = new awsSdk.SecretsManager();

const FREEUS_BEGIN: string = "SigBegin";
const FREEUS_END: string = "SigClr";
let vendorName: string = "";
let vendorSecret: string = "";

export const handler = middy(
  async (event: Root): Promise<APIGatewayProxyResult> => {
    try {
      console.log("inside of the freeus handler ====== ", event);

      if (event && event.detail.event.deviceId) {
        console.log("inside of device");
        const token = await login();
        console.log({ token });
        const device = await getDeviceDetail(
          token.token,
          event.detail.event.deviceId
        );
        console.log({ device });

        const vendorExists: SchoolConfig = await checkVendorExists(
          token.token,
          device.school
        );
        console.log({ vendorExists });
        console.log("====================================");
        if (vendorExists.data === null) {
          console.log("vendorExists.data", vendorExists.data);
          // no need to send alert
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: `Vendor details not found.`,
            }),
          };
        } else {
          console.log("vendorExists.data ==== 60", vendorExists.data);

          if (vendorExists.data.alert?.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({
                message: `Alert details not found.`,
              }),
            };
          } else {
            vendorName = vendorExists.data.alert
              ? vendorExists.data.alert[0].vendor
              : "";
            console.log({ vendorName });

            if (vendorName === "") {
              return {
                statusCode: 404,
                body: JSON.stringify({
                  message: `Vendor details not found.`,
                }),
              };
            }

            const secretValue: any = await getSecretDetails(vendorName);

            console.log({ secretValue });
            if (!secretValue) {
              return {
                statusCode: 500,
                body: JSON.stringify({
                  message: `secret String not found`,
                }),
              };
            }
            // read key
            vendorSecret = secretValue.key;
            console.log({ vendorSecret });

            console.log("checking opt act");
            // if msg is a SigClr
            if (event.detail.event.opAct == FREEUS_END) {
              console.info("cancelling alert now ======================");
              // Add a bit of a pad to hopefully not have the end finish before the begin.
              // This should hopefully not have to be a thing in the future.
              // setTimeout(async () => {
              console.info(`Got clear message for device ${device.key}`);
              // list the current alerts
              const alerts = await getCurrentAlerts(token.token, device.school);
              if (alerts.length > 0) {
                const alertsAtSchool = alerts.filter(
                  (alert) => alert.school == device.school
                );
                // for each alert, delete it
                Promise.all(
                  alertsAtSchool.map((alert) => {
                    return cancelAlert(
                      token.token,
                      alert.id,
                      vendorSecret,
                      vendorName
                    );
                  })
                );
              }
              await clearPosition(token.token, device.key);
              return {
                statusCode: 500,
                body: JSON.stringify({
                  message: `secret String not found`,
                }),
              };
            }
            if (device.device_type === "freeus") {
              if (event.detail.event.latitude && event.detail.event.longitude) {
                console.info(`Got position message for device ${device.key}`);
                updatePosition(
                  token.token,
                  device.key,
                  event.detail.event.latitude,
                  event.detail.event.longitude
                );
              }
            }
            // if msg is a SigBegin
            if (event.detail.event.opAct == FREEUS_BEGIN) {
              console.info(`Got begin message for device ${device.key}`);
              await handleStartAlert({
                token: token.token,
                rerun: true,
                device,
                vendorSecret,
                vendorName,
              });
              if (device.device_type === "freeus_static") {
                setRoomStatus({
                  token: token.token,
                  room: device.room,
                });
              }
            }
            return {
              statusCode: 200,
              body: JSON.stringify(`tiaki lambda hit successfully`),
            };
          }
        }
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: `Device is not provided`,
          }),
        };
      }
    } catch (e) {
      console.log("error occurred", e);
      return {
        statusCode: 404,
        body: JSON.stringify(`Error occurred`),
      };
    }
  }
).use(
  ssm({
    awsSdkOptions: { region: process.env.AWS_REGION || "us-west-2" },
  })
);

export async function getSecretDetails(vendorName) {
  try {
    const secretName = `dirs/jwt/${vendorName}`;

    console.log({ secretName });
    console.log("here ========================== 190");
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();

    console.log("here ========================== 194");

    console.log({ data });

    if (!data.SecretString) {
      console.info("secret String not found");
      return false;
    }
    // Parse the secret value
    let secretValue: string = "";

    try {
      secretValue = JSON.parse(data.SecretString);
      return secretValue;
    } catch (err) {
      console.info("Failed to parse SecretString");
      return false;
    }
  } catch (error) {
    console.log("error ================= ", error);
    // Handle ResourceNotFoundException
    if (error?.code === "ResourceNotFoundException") {
      console.error("Secret not found:", error.message);
      return false;
    }
    // Handle JsonWebTokenError
    if (
      error.name === "JsonWebTokenError" &&
      error.message === "invalid signature"
    ) {
      console.error("Invalid token signature:", error.message);
      return false;
    }
    return false;
  }
}
