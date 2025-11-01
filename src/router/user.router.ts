import express from 'express';
import { verifyToken } from '../middleware/verify-token.middleware';
import { addUserApiKeys, changeUserPassword, getApiKeys, getUserDetails, importTwilioNumber, updateUserDetails } from '../controller/user.controller';

const router = express.Router();

router.get('/get-user-details',verifyToken,getUserDetails);
router.get('/get-user-api-keys',verifyToken, getApiKeys);
router.put('/update-user-details',verifyToken, updateUserDetails);
router.put('/change-user-password',verifyToken, changeUserPassword);
router.put('/set-vapi-api-keys', verifyToken, addUserApiKeys);
router.get('/import-twilio-number', verifyToken, importTwilioNumber);

export default router;