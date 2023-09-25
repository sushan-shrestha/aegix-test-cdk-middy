import { APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import middy from "middy";
import { ssm } from "middy/middlewares";
import { sign as jwtSign } from "jsonwebtoken";

export interface IncomingEvent {
  version: string;
  id: string;
  "detail-type": string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: any[];
  detail: Detail;
}

export interface Detail {
  hook: Hook;
  data: Data;
}

export interface Hook {
  id: number;
  event: string;
  target: string;
}

export interface Data {
  model: string;
  pk: number;
  fields: Fields;
}

export interface Fields {
  name: number;
  created: string;
  school: number;
  content_type: string;
  object_id: string;
  initiator: number;
  police_status: string;
  scoped: boolean;
  silent: boolean;
  internal: boolean;
  pending_approval: boolean;
}

async function login() {
  const data = {
    email: "system@aegixglobal.com",
    password: "Password@123",
  };

  return axios
    .post("https://test.dirs.app/api/v1/auth/", data)
    .then((response) => {
      return {
        token: response.data.jwt,
        school: response.data.schools,
      };
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

// get Alert detail
async function getSchoolConfig(loginInfo: { token: string; school: number }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `JWT ${loginInfo.token}`,
  };

  let query = "?is_announce=true";

  return axios
    .get(`https://test.dirs.app/api/v2/school/${loginInfo.school}/${query}`, {
      headers,
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

// post to announce API
async function announceApi(data: Data) {
  const token = jwtSign({}, "access_secretStringPleaseChangeForProduction", {
    expiresIn: Math.floor(Date.now() / 1000) + 60 * 5,
  });
  const headers = {
    "Content-Type": "application/json",
    vendor: `sushanoc`,
    Authorization: `Bearer ${token}`,
  };

  return axios
    .post(
      `https://txegzwhb8k.execute-api.us-west-2.amazonaws.com/no-auth/announce`,
      {
        headers,
        data,
      }
    )
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
  return;
}

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

      if (!loginData.school.includes(school)) {
        throw new Error("School not linked");
      }

      loginData.school = school;

      const { data } = await getSchoolConfig(loginData);

      if (!data) {
        // send error
        throw new Error("Unable to get school config data");
      }
      const { "alert-types": alertTypes } = data.announce;

      if (!alertTypes.some((alertType: number) => alertType === name)) {
        throw new Error("Alert type should not be announced");
      }

      announceApi(event.detail.data);

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
