import { Request, Response } from "express";
import User from "../models/user";
import bcrypt from 'bcrypt'
import { Model } from "sequelize";
import jwt from 'jsonwebtoken'
import axios from "axios";
import crypto from 'crypto'

export interface UserPayload {
    id:string,
    firstName:string,
    lastName:string,
    email:string,
} 

export interface UserIT extends Model  {
    id:string,
    firstName:string,
    lastName:string,
    email:string,
    password:string
}

export const login = async  (req:Request, res:Response) => {
    try {
        const body = req.body;
        const user:UserIT | null = await User.findOne({where:{email:body.email}}) as UserIT;
        if(!user) {
            return res.status(404).json({message:'User not found...'})
        } 
        const validPassword:boolean = await bcrypt.compare(body.password, user.password);
        if(!validPassword) {
            return res.status(400).json({message:"Password does not match please try again"});
        }
    
        const payload:any = {
            id:user.id,
            firstName:user.firstName,
            lastName:user.lastName,
            email:user.email,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn:'1day'});
        payload.accessToken = accessToken
        res.cookie('AccessToken', accessToken, { httpOnly:true, secure:true, sameSite:'lax', maxAge:24 * 60 * 60 * 1000 })
        return res.status(200).json({message:"Logged in successfully", user:payload});
    } catch(error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const register = async (req:Request, res:Response) => {
    try {
        const body = req.body;
        console.log(body);
        const user = await User.findOne({where:{email:body.email}});
        if(user) {
            return res.status(400).json({message:"User with this email already exists"});
        }
        const hashedPassword = await bcrypt.hash(body.password, 16);
        
        body.password = hashedPassword;
        const newUser:UserIT = (await User.create(body) as UserIT).get({plain:true});
        const payload:any = {
            id:newUser.id,
            firstName:newUser.firstName,
            lastName:newUser.lastName,
            email:newUser.email,
        };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET as string, {expiresIn:'1day'});
        payload.accessToken = accessToken;
        res.cookie('AccessToken', accessToken, { httpOnly:true, secure:true, sameSite:'lax', maxAge:24 * 60 * 60 * 1000 })
        return res.status(200).json({message:"Registered successfully...", user:payload})
    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const authenticateMagento = async (req:Request, res:Response) => {
    try{    
        const magentoUrl: string = 'https://keystation.co.uk/ksbackend/rest/V1/';
        const api: string = 'integration/';
        const method: string = 'admin/token';
        const url:string = magentoUrl + api + method;
        console.log("COmplete URL : ", url)
        const magentoCredentials:any = {
            username:'Etechflow',
            password: `1uV"'4KS@C4y`
        }
        const response = await axios.post(url, magentoCredentials, {
            headers: { "Content-Type": "application/json" }
        })
        console.log(response);
        return res.status(200).send("OK")
    } catch(error:any) {
        return res.status(500).json({message:error});
    }
}


export const callbackMagento = async (req:Request, res:Response) => {
    try {
        console.log("CALL BACK REQUEST ")
        console.log("BODY : ", req.body);
        console.log("PARAMS : ", req.params);
        console.log("QUERY : ", req.query);
        return res.send('OK');
    } catch(error:any) {
        console.log(error.message);
        return res.status(500).json({message:error.message})
    }
}


export const magentoIdentity = async (req: Request, res: Response) => {
    try {
        console.log("QUERY : ", req.query);

        const { success_call_back, oauth_consumer_key } = req.query;

        const consumerSecret = 'v5p72krchl7z4k8zotmtvwpatk0r1alp';

        const magentoUrl = 'https://keystation.co.uk';
        const endpoint = '/oauth/token/request';
        const url = magentoUrl + endpoint;

        const oauthParams: any = {
            oauth_consumer_key: oauth_consumer_key as string,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA256',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_version: '1.0',
            oauth_callback: success_call_back as string
        };

        const signature = generateSignature('POST', url, oauthParams, consumerSecret, '');
        oauthParams.oauth_signature = signature;

        const authHeader = buildAuthorizationHeader(oauthParams);

        const response = await axios.post(url, null, {
            headers: {
                'Authorization': authHeader
            }
        });

        console.log("Response:", response.data);
        const tokenData = parseQueryString(response.data);

        return res.status(200).json({
            success: true,
            requestToken: tokenData.oauth_token,
            requestTokenSecret: tokenData.oauth_token_secret
        });

    } catch (error: any) {
        console.log("error : ", error.response?.data || error.message);
        return res.status(500).send("An Error has occurred");
    }
}

function generateSignature(
    method: string,
    url: string,
    params: any,
    consumerSecret: string,
    tokenSecret: string = ''
): string {
    const sortedParams = Object.keys(params)
        .filter(key => key !== 'oauth_signature')
        .sort()
        .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
        .join('&');

    const baseString = [
        method.toUpperCase(),
        percentEncode(url),
        percentEncode(sortedParams)
    ].join('&');

    const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

    const signature = crypto
        .createHmac('sha256', signingKey)
        .update(baseString)
        .digest('base64');

    return signature;
}
function percentEncode(str: string): string {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/\*/g, '%2A')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/'/g, '%27');
}

function buildAuthorizationHeader(params: any): string {
    const authParams = Object.keys(params)
        .map(key => `${percentEncode(key)}="${percentEncode(params[key])}"`)
        .join(', ');

    return `OAuth ${authParams}`;
}

function parseQueryString(str: string): any {
    const params: any = {};
    str.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
    });
    return params;
}