import { UserPayload } from "../controller/authenticate.controller";
import { JwtPayload } from "../Interfaces/JwtPayload.interface";

declare global {
  namespace Express {
    interface Request {
      CurrentUser?: UserPayload;
      // session:{
      //   oAuthState:string
      // }
    }
  }
}