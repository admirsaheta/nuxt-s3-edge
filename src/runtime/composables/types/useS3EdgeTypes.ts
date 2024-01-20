// Auth Header Types
export interface S3AuthHeaders {
  authorization: string;
}

// S3 Config Types
export interface S3Config {
  accept: RegExp;
  maxSizeMb?: number;
}

// Error Handling Types
export interface S3Error {
  message: string;
}

// S3 Metadata Types
export type S3ObjectMetadata = Record<string, string>
