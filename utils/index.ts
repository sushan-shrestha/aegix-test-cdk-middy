import axios from "axios";
import { sign as jwtSign } from "jsonwebtoken";
import { Data, StartAlert } from "../types";

export async function login() {
  const data = {
    email: "system@aegixglobal.com",
    password: "pWNpm9)~.e$c5#5",
  };

  return axios
    .post("https://dirs.app/api/v1/auth/", data)
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
export async function getSchoolConfig(loginInfo: {
  token: string;
  school: number;
}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `JWT ${loginInfo.token}`,
  };

  let query = "?is_announce=true";

  return axios
    .get(`https://dirs.app/api/v2/school/${loginInfo.school}/${query}`, {
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
export async function announceApi(data: Data, vendor: string) {
  const token = jwtSign({}, "access_secretStringPleaseChangeForProduction", {
    expiresIn: Math.floor(Date.now() / 1000) + 60 * 5,
  });
  const headers = {
    "Content-Type": "application/json",
    vendor,
    Authorization: `Bearer ${token}`,
  };

  console.log({ vendor });

  return axios
    .post(`https://api.dirs.app/announce`, {
      headers,
      data,
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

export async function getDeviceDetail(token: string, deviceId: string) {
  return axios
    .get(`https://dirs.app/api/v2/device-by-key/${deviceId}/`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `jwt ${token}`,
      },
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

// get vendors detail
export async function checkVendorExists(token: string, school: string) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `JWT ${token}`,
  };

  const query = "?is_announce=true";

  console.info(`https://dirs.app/api/v2/school/${school}/${query}`);
  return axios
    .get(`https://dirs.app/api/v2/school/${school}/${query}`, {
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

export function getCurrentAlerts(token: string, school: string | null = null) {
  let query = "?";
  if (school !== null) {
    query += `school=${school}`;
  }
  return axios
    .get(`https://dirs.app/api/v2/alert/${query}`, {
      headers: {
        Authorization: `jwt ${token}`,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      return response.data.results;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

export async function cancelAlert(
  token: string,
  alertId: number,
  vendorSecret: string,
  vendorName: string
) {
  return axios.delete(`https://api.dirs.app/alert/${alertId}`, {
    headers: {
      Authorization: `Bearer ${getJwtToken(vendorSecret)}`,
      "Content-Type": "application/json",
      vendor: `${vendorName}`,
    },
  });
}

const getJwtToken = (vendorSecret: string) => {
  const newToken = jwtSign({}, `${vendorSecret}`, {
    expiresIn: `15m`,
  });

  return newToken;
};

export async function clearPosition(token: string, deviceID: string) {
  return axios
    .patch(
      `https://dirs.app/api/v2/device-by-key/${deviceID}/`,
      JSON.stringify({
        latitude: null,
        longitude: null,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${token}`,
        },
      }
    )
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

export async function updatePosition(
  token: string,
  deviceID: string,
  latitude: number | string,
  longitude: number | string
) {
  return axios
    .patch(
      `https://dirs.app/api/v2/device-by-key/${deviceID}/`,
      JSON.stringify({
        latitude,
        longitude,
      }),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${token}`,
        },
      }
    )
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

export async function handleStartAlert({
  token,
  rerun,
  device,
  vendorSecret,
  vendorName,
}) {
  const alertType = device?.alert_type;
  const school = device?.school;
  const ownerId = device?.owner_id;
  const ownerType = device?.owner_type;
  const deviceKey = device?.key;
  const room = device?.room;

  console.info("Starting Alert");
  // make call to start alert
  const args: StartAlert = {
    alert: {
      siteId: `${school}`,
      type: `${alertType}`,
      message: `Panic Button Alert Triggered by device: ${deviceKey}`,
      startedAt: new Date(),
      disposition: {
        urgency: "emergency",
      },
    },
    source: {
      id: "vendor-id",
      label: "Vendor Name",
      description: "Alert triggered by vendor-123",
      device: `${deviceKey}`,
      room,
    },
    post: {
      message: `Alert triggered by Panic Button with device: ${deviceKey}`,
    },
  };

  // if (!args.source) {
  //   args.source = {
  //     id: "vendor-id",
  //     label: "Vendor Name",
  //     description: "Alert triggered by vendor-123",
  //     device: `${deviceKey}`,
  //   };
  // }
  // args.source.room = room;

  if (args?.alert) {
    if (ownerType == "user") {
      args.alert.initiator = `${ownerId}`;
    }
  }

  console.log({ vendorSecret });
  console.log({ vendorName });

  const clientToken = getJwtToken(vendorSecret);


  await axios
    .post(`https://api.dirs.app/alert`, JSON.stringify(args), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
        vendor: `${vendorName}`,
      },
    })
    .then((response) => {
      console.info("Alert Started", response);
      return response;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}

export async function setRoomStatus({ token, room }) {
  return axios
    .patch(
      `${process.env.DIR_S_HOST}/api/v2/room/${room}/`,
      JSON.stringify({
        safe: "unsafe",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${token}`,
        },
      }
    )
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error({ error });
      return error;
    });
}
