import express from 'express';
import {findOrderByCustomer, getMagentoProduct, getOrderStatus} from '../controller/magento.controller';

const router = express.Router();

router.get('/get-magento-products', getMagentoProduct);
router.get('/get-magento-orders', findOrderByCustomer);
router.get('/get-order-status', getOrderStatus);


export default router;