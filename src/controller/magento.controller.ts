import { Request, Response } from "express"

const mockData = [
    {
        id: 1,
        name: "Wireless Bluetooth Earbuds",
        productNumber: "WB-2024",
        description: "High-quality wireless earbuds with noise cancellation and 24-hour battery life",
        price: 79.99
    },
    {
        id: 2,
        name: "Smart Fitness Watch",
        productNumber: "SF-2024",
        description: "Advanced fitness tracker with heart rate monitoring, GPS, and sleep analysis",
        price: 149.99
    },
    {
        id: 3,
        name: "Mechanical Gaming Keyboard",
        productNumber: "MG-2024",
        description: "RGB mechanical keyboard with customizable keys and rapid response technology",
        price: 89.99
    },
    {
        id: 4,
        name: "Portable Power Bank",
        productNumber: "PP-2024",
        description: "20000mAh portable charger with fast charging and multiple USB ports",
        price: 39.99
    },
    {
        id: 5,
        name: "Wireless Charging Stand",
        productNumber: "WC-2024",
        description: "Fast wireless charging stand compatible with all Qi-enabled devices",
        price: 29.99
    },
    {
        id: 6,
        name: "Noise Cancelling Headphones",
        productNumber: "NC-2024",
        description: "Over-ear headphones with active noise cancellation and premium sound quality",
        price: 199.99
    },
    {
        id: 7,
        name: "Smart Home Speaker",
        productNumber: "SH-2024",
        description: "Voice-controlled smart speaker with virtual assistant and home automation",
        price: 99.99
    },
    {
        id: 8,
        name: "4K Action Camera",
        productNumber: "AC-2024",
        description: "Waterproof 4K camera with image stabilization for adventure photography",
        price: 129.99
    }
]
export const getMagentoProduct = (req:Request,res:Response) => {
    try {   
        const { name, productNumber, description } = req.query;
        const product = mockData.find((product:any) => 
            product.name == name ||
            productNumber == productNumber ||
            description == description
        ) 

        return product;

    } catch (error:any) {
        return res.status(500).json({message:error.message});
    }
}

const mockOrders = [
    {
        orderNumber: "ORD-1001",
        customerName: "John Smith",
        email: "john@example.com",
        phone: "+15550000001",
        status: "Shipped",
    },
    {
        orderNumber: "ORD-1002",
        customerName: "Emily Brown",
        email: "emily@example.com",
        phone: "+15550000002",
        status: "Delivered",
    },
    {
        orderNumber: "ORD-1003",
        customerName: "Mark Johnson",
        email: "mark@example.com",
        phone: "+15550000003",
        status: "Processing",
    },
];

export const findOrderByCustomer = async (req: Request, res: Response) => {
    try {
        const { customerName } = req.body; // Comes from Vapi function call payload

        const order = mockOrders.find(
            (o) => o.customerName.toLowerCase() === customerName.toLowerCase()
        );

        if (!order) {
            return res.json({ success: false, message: "no match found" });
        }

        return res.json({
            success: true,
            orderNumber: order.orderNumber,
            status: order.status,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: "server-error",
            error: error.message,
        });
    }
};

export const getOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderNumber } = req.body; // Comes from Vapi function call payload

        const order = mockOrders.find(
            (o) => o.orderNumber.toLowerCase() === orderNumber.toLowerCase()
        );

        if (!order) {
            return res.json({ success: false, message: "no match found" });
        }

        return res.json({
            success: true,
            orderNumber: order.orderNumber,
            status: order.status,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: "server-error",
            error: error.message,
        });
    }
};