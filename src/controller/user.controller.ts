import { Request, Response } from "express";
import User from "../models/user";
import bcrypt from 'bcrypt';
import { UserIT } from "./authenticate.controller";
import ApiKeys from "../models/apikey";
import { where } from "sequelize";
import { getTwilioClient } from "../configs/twilio.config";
import Vapi from "../models/vapi";
import { maskPhoneNumber } from "../utlis/mask-phone-number";
import axios from "axios";
import TwilioNumbers from "../models/twilioNumbers";


export const getUserDetails =  async (req:Request, res:Response) => {
    try {
        const currUser = req.CurrentUser;
        const user = await User.findOne({
            include:[{
                model:ApiKeys,
                as:'apiKeys'
            }],
            where:{
                id:currUser?.id
            },
            attributes:['firstName', 'lastName', 'email'],
            raw:true,
            nest:true
        })

        return res.status(200).json({user});
    } catch(error:any) {
        console.log("Error : ", error)
        return res.status(500).json({message:error.message});
    }
}

export const updateUserDetails = async (req:Request,res:Response) => {
    try {
        const currUser = req.CurrentUser;
        const data = req.body;
        const user = await User.update(data, {where:{id:currUser?.id}});
        return res.status(200).json({message:"User updated successfully..."});
    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const changeUserPassword = async (req:Request, res:Response) => {
    try {
        const currUser = req.CurrentUser;
        const password = req.body;

        const user = await User.findOne({where:{id:currUser?.id}}) as UserIT;
        const validatePassword:boolean = await bcrypt.compare(password.currentPassword, user.password);
        
        if(!validatePassword) {
            return res.status(400).json({message:"Current Password is not correct"});
        }

        if(password.newPassword !== password.confirmNewPassword) {
            return res.status(400).json({message:"Password does not match plaese try again"});
        }

        const hashedPassword = await bcrypt.hash(password.newPassword, 16);
        await user.update({ password: hashedPassword });


        return res.status(200).json({message:"Password updated successfully"});

    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const addUserApiKeys = async (req: Request, res: Response) => {
  try {
    const currUser = req.CurrentUser;
    const payload = {
      ...req.body,
      ...(req.body.userId ? {} : { userId: currUser?.id }), 
    };
    console.log("API KEYS : ",payload);
    const [apiKey, created] = await ApiKeys.upsert(payload);
    
    return res.status(200).json({
      message: created ? "API keys created successfully" : "API keys updated successfully",
      data: apiKey,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};


export const getApiKeys = async (req:Request, res:Response) => {
    try {
        const currUser = req.CurrentUser;
        const keys = await ApiKeys.findOne({where:{userId:currUser?.id}, raw:true});
        const vapi = await Vapi.findOne({where:{userId:currUser?.id}, raw:true,attributes:["phoneNumber"]}) as any;
        console.log(vapi);
        
        return res.status(200).json({keys:{...keys,  phoneNumber:maskPhoneNumber(vapi?.phoneNumber)}})
    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const importTwilioNumber = async (req:Request,res:Response) => {
    try {
        const currUser = req.CurrentUser;
        const number = req.body;
        const apiKey = await ApiKeys.findOne({
            where:{userId:currUser?.id},
            attributes: ["twilioAccountId", "twilioAccessKey", "vapiKey"],
            raw:true,
        }) as any;
        const url:string = 'https://api.vapi.ai'
        const api:string = '/phone-number';
        const completeUrl:string = url + api;

        const response = await axios.post(completeUrl, {
            provider:"twilio",
            number:number.label,
            twilioAccountSid: apiKey.twilioAccountId,
            twilioAuthToken:apiKey.twilioAccessKey
        }, {
            headers:{
                Authorization:`Bearer ${apiKey.vapiKey}`
            }
        })  

        await Vapi.update({ phoneNumberId: response.data.id, phoneNumber:response.data.number }, { where: { userId: currUser?.id, } })
        return res.status(200).json({message:"Number added successfully"})

    } catch (error:any){
        console.log(error);
        return res.status(500).json({ message: error.response.data.message || error.message });
    }
}

export const getTwilionNumbers = async (req:Request, res:Response) => {
    try {
        const user = req.CurrentUser;
        const apiKey = await ApiKeys.findOne({where:{userId:user?.id}}) as any;
        const client = getTwilioClient(apiKey.twilioAccountId, apiKey.twilioAccessKey);
        if (!client) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }
        const numbers = await client.incomingPhoneNumbers.list();
        const numberOptions = numbers.map(number => ({
            label: number.phoneNumber,
            value: number.sid
        }));
        return res.status(200).json({numbers:numberOptions});   
    } catch(error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const verifyMagentoDetailsExists = async (req:Request, res:Response) => {
    try {
        const user = req.CurrentUser;
        const magento = await ApiKeys.findOne({where:{userId:user?.id}}) as any;
        if(magento?.magentoUsername) {
            return res.status(200).json({exists:true})
        } else {
            return res.status(200).json({exists:false});
        }
    } catch (error:any) {
        return res.status(500).json({ message: error.message });
    }
}

export const getNumbers = async (req:Request, res:Response) => {
    try {
        const user = req.CurrentUser;
        const numbers = await TwilioNumbers.findAll({
            where:{userId:user?.id}
        })

        return res.status(200).json({numbers});
    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const saveTwilioNumber = async (req:Request, res:Response) => {
    try {
        const user = req.CurrentUser;
        const body = req.body;
        const payload = {
            phoneNumber:body.number,
            userId:user?.id
        }
        const number = await TwilioNumbers.create(payload)
        return res.status(200).json({message:"Number Saved Successfully"})
    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

export const deleteNumber = async (req:Request,res:Response) => {
    try {
        const body = req.body;
        const deletedNumber = await TwilioNumbers.destroy({
            where:{id:body.id}
        });
        return res.status(200).json({message:"Number deleted successfully..."})
    }catch(error:any) {
        return res.status(509).json({message:error.message});
    }
}

