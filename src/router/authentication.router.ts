import express from "express";
import { authenticateMagento, login, magentoIdentity, register, saveMagentoDetails } from "../controller/authenticate.controller";
import { verifyToken } from "../middleware/verify-token.middleware";

const router = express.Router();

router.post('/login',login);
router.post('/register',register);
router.get('/magento',authenticateMagento);
router.post('/save-magento-details',verifyToken,saveMagentoDetails);
router.get('/magento/identity',magentoIdentity)

export default router;
