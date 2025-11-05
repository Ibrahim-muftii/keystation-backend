import express from 'express';
import { verifyToken } from '../middleware/verify-token.middleware';
import { addUserApiKeys, changeUserPassword, deleteNumber, getApiKeys, getNumbers, getTwilionNumbers, getUserDetails, importTwilioNumber, saveTwilioNumber, updateUserDetails, verifyMagentoDetailsExists } from '../controller/user.controller';

const router = express.Router();

router.get('/get-user-details',verifyToken,getUserDetails);
router.get('/get-user-api-keys',verifyToken, getApiKeys);
router.get('/is-magento-exists', verifyToken, verifyMagentoDetailsExists)
router.put('/update-user-details',verifyToken, updateUserDetails);
router.put('/change-user-password',verifyToken, changeUserPassword);
router.put('/set-vapi-api-keys', verifyToken, addUserApiKeys);
router.post('/import-twilio-number', verifyToken, importTwilioNumber);
router.get("/get-twilio-numbers",verifyToken, getTwilionNumbers);
router.get("/get-numbers", verifyToken, getNumbers);
router.post("/save-number", verifyToken, saveTwilioNumber);
router.post("/delete-user-number", verifyToken, deleteNumber)

export default router;