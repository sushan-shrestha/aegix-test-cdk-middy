import { APIGatewayProxyResult } from "aws-lambda";
import middy from "middy";
import { ssm } from "middy/middlewares";
import { IncomingEvent, vendorName } from "../types";
import { announceApi, getSchoolConfig, login } from "../utils";

export const handler = middy(
  async (event: IncomingEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (
        !event.detail ||
        event.detail === undefined ||
        event.detail.data === undefined ||
        event.detail.data.fields === undefined
      ) {
        return {
          statusCode: 404,
          body: JSON.stringify(`Invalid Data provided`),
        };
      }

      const { school, name, silent } = event.detail.data.fields;

      if (silent || silent === undefined) {
        return {
          statusCode: 401,
          body: JSON.stringify(`Silent Alert!`),
        };
      }

      let loginData = await login();
      console.log("login =================== ", loginData);

      // if (!loginData.school.includes(school)) {
      //   throw new Error("School not linked");
      // }

      loginData.school = school;

      const { data } = await getSchoolConfig(loginData);

      console.log("data ================= ", data);

      if (!data) {
        // send error
        throw new Error("Unable to get school config data");
      }

      const { announce } = data;

      console.log("announce ================ ", announce);

      if (!(announce.length > 0)) {
        throw new Error("Announce not configured for this site");
      }

      announce.map((a: vendorName) => {
        announceApi(event.detail.data, a.vendor);
      });

      return {
        statusCode: 200,
        body: JSON.stringify(`tiaki lambda hit successfully`),
      };
    } catch (e) {
      console.log("error occurred", e);
      console.log(e?.code);
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
