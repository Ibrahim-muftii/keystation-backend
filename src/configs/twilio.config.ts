import { Twilio } from "twilio"


export const  getTwilioClient = (accountId:string, accessKey:string) => {
    const client = new Twilio(accountId, accessKey);
    return client;
}