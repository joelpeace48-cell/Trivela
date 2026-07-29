import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    /** Raw request body Buffer, set by the express.raw()/body-parser verify hook for HMAC signature checks. */
    rawBody?: Buffer;
  }
}
