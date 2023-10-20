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

export interface vendorName {
  vendor: string;
}

export interface Root {
  detail: {
    event: Event;
    source: Source;
  };
}

export interface Event {
  deviceId: string;
  [name: string]: number | string;
}

export interface Source {
  [name: string]: number | string;
}

export interface SchoolConfig {
  id: number;
  name: string;
  status: string;
  svg: string | null;
  json_map: string;
  icon: string | null;
  address: string | null;
  address_2: string | null;
  zip: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  alerts_enabled: boolean;
  boards_enabled: boolean;
  chat_enabled: boolean;
  maps_enabled: boolean;
  drill_enabled: boolean;
  show_safe_unsafe: boolean;
  data: Data | null;
  latitude: string | number | null;
  longitude: number | string | null;
  phone_number: string | null;
  district: number;
}

export interface Data {
  alert?: Vendor[];
  "digital-911"?: Vendor[];
  access?: Vendor[];
  announce?: Vendor[];
}

export interface Vendor {
  vendor: string;
}

export interface StartAlert {
  alert: Alert;
  source?: Source;
  post?: Post;
}

export interface Alert {
  siteId: string;
  type: string;
  message: string;
  startedAt?: Date;
  disposition?: Disposition;
  initiator?: string;
}

export interface Disposition {
  urgency: string;
}

export interface Source {
  id: string;
  label: string;
  description: string;
  device: string;
  room: string;
}

export interface Post {
  message: string;
}
