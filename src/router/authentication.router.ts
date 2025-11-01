import express from "express";
import { authenticateMagento, callbackMagento, login, magentoIdentity, register } from "../controller/authenticate.controller";

const router = express.Router();

router.post('/login',login);
router.post('/register',register);
router.get('/magento',authenticateMagento);
router.get('/magento/callback', callbackMagento);
router.get('/magento/identity',magentoIdentity)

export default router;
