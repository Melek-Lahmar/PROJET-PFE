declare module "open-location-code" {
  export class OpenLocationCode {
    static encode(latitude: number, longitude: number, codeLength?: number): string;
  }

  export function encode(latitude: number, longitude: number, codeLength?: number): string;
}