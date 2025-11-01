import { Request, Response } from "express"
import { searchMagentoProducts, getMagentoProductBySku } from "../helpers/magento-api.helper";

export const getMagentoProduct = async (req:Request, res:Response) => {
    try {
        const { name, sku, productNumber } = req.query;

        // If SKU or productNumber is provided, get product by SKU
        if (sku || productNumber) {
            const skuValue = (sku || productNumber) as string;
            const product = await getMagentoProductBySku(skuValue);
            return res.status(200).json({
                success: true,
                product: product
            });
        }

        // If name is provided, search products by name
        if (name) {
            const searchCriteria = { name: name as string };
            const result = await searchMagentoProducts(searchCriteria);
            return res.status(200).json({
                success: true,
                products: result.items || [],
                total_count: result.total_count || 0
            });
        }

        // If no search criteria provided, return error
        return res.status(400).json({
            success: false,
            message: "Please provide at least one search parameter (name, sku, or productNumber)"
        });

    } catch (error:any) {
        console.error("Error fetching Magento product:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch product from Magento",
            error: error.response?.data || error.message
        });
    }
}

export const findOrderByCustomer = async (req: Request, res: Response) => {
    try {
        const { customerName, email } = req.query;

        if (!customerName && !email) {
            return res.status(400).json({
                success: false,
                message: "Please provide customerName or email parameter"
            });
        }

        const searchCriteria: any = {};
        if (customerName) searchCriteria.customerName = customerName as string;
        if (email) searchCriteria.email = email as string;

        const { searchMagentoOrders } = await import("../helpers/magento-api.helper");
        const result = await searchMagentoOrders(searchCriteria);

        if (!result.items || result.items.length === 0) {
            return res.json({
                success: false,
                message: "No orders found for the provided customer"
            });
        }

        return res.json({
            success: true,
            orders: result.items,
            total_count: result.total_count
        });
    } catch (error: any) {
        console.error("Error finding orders:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders from Magento",
            error: error.response?.data || error.message
        });
    }
};

export const getOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderNumber, orderId } = req.query;

        if (!orderNumber && !orderId) {
            return res.status(400).json({
                success: false,
                message: "Please provide orderNumber or orderId parameter"
            });
        }

        const { searchMagentoOrders, getMagentoOrderById } = await import("../helpers/magento-api.helper");

        // If orderId is provided, get order by ID directly
        if (orderId) {
            const order = await getMagentoOrderById(orderId as string);
            return res.json({
                success: true,
                order: order,
                orderNumber: order.increment_id,
                status: order.status
            });
        }

        // If orderNumber is provided, search for the order
        if (orderNumber) {
            const result = await searchMagentoOrders({ incrementId: orderNumber as string });

            if (!result.items || result.items.length === 0) {
                return res.json({
                    success: false,
                    message: "No order found with the provided order number"
                });
            }

            const order = result.items[0];
            return res.json({
                success: true,
                order: order,
                orderNumber: order.increment_id,
                status: order.status
            });
        }

    } catch (error: any) {
        console.error("Error fetching order status:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch order status from Magento",
            error: error.response?.data || error.message
        });
    }
};