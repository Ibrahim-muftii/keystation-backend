import axios from "axios";
import { Request, Response } from "express";

export const vapiWebhook = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        if (message?.type === 'tool-calls') {
            const { toolCalls } = message;
            console.log("All Tool Calls: ", toolCalls);

            // Process each tool call
            const results = await Promise.all(
                toolCalls.map(async (toolCall: any) => {
                    // ============================================
                    // ORDER STATUS FUNCTION
                    // ============================================
                    if (toolCall.function.name === 'getOrderStatus') {
                        const { orderNumber, orderId } = toolCall.function.arguments;
                        console.log("Order Number: ", orderNumber);
                        console.log("Order Id: ", orderId);

                        try {
                            const orderResponse = await axios.get(
                                `http://localhost:5400/magento/get-order-status?${orderNumber ? `orderNumber=${orderNumber}` : `orderId=${orderId}`
                                }`
                            );

                            const orderData = orderResponse.data;

                            if (orderData.success) {
                                const fullOrderDetails = {
                                    orderNumber: orderData.orderNumber,
                                    status: orderData.status,
                                    grandTotal: orderData.order.grand_total,
                                    totalItems: orderData.order.items?.length || 0,
                                    items: orderData.order.items?.map((item: any) => ({
                                        name: item.name,
                                        quantity: item.qty_ordered,
                                        price: item.price,
                                        sku: item.sku
                                    })),
                                    shippingAddress: {
                                        street: orderData.order.shipping_address?.street,
                                        city: orderData.order.shipping_address?.city,
                                        region: orderData.order.shipping_address?.region,
                                        postcode: orderData.order.shipping_address?.postcode,
                                        country: orderData.order.shipping_address?.country_id
                                    },
                                    customerName: `${orderData.order.customer_firstname} ${orderData.order.customer_lastname}`,
                                    customerEmail: orderData.order.customer_email,
                                    createdAt: orderData.order.created_at,
                                    subtotal: orderData.order.subtotal,
                                    shippingAmount: orderData.order.shipping_amount,
                                    taxAmount: orderData.order.tax_amount
                                };

                                const orderSummary = `[ORDER_DATA]${JSON.stringify(fullOrderDetails)}[/ORDER_DATA]
                                INITIAL_RESPONSE: I found your order ${orderData.orderNumber}! The status is ${orderData.status} and it contains ${orderData.order.items?.length || 0} items with a grand total of $${orderData.order.grand_total}.`;
                                return {
                                    toolCallId: toolCall.id,
                                    result: orderSummary
                                };
                            } else {
                                return {
                                    toolCallId: toolCall.id,
                                    result: `I couldn't find any order with that number. Could you please double-check your order number? It should be in your confirmation email.`
                                };
                            }

                        } catch (orderError: any) {
                            console.error("Error fetching order:", orderError);
                            return {
                                toolCallId: toolCall.id,
                                result: "Sorry, I'm having trouble accessing order information right now. Please try again in a moment."
                            };
                        }
                    }

                    // ============================================
                    // PRODUCT SEARCH FUNCTION
                    // ============================================
                    if (toolCall.function.name === 'searchProduct') {
                        console.log("SEARCH PRODUCT CALLED ");
                        const { name, sku, productNumber } = toolCall.function.arguments;
                        console.log("ARGUMENTS : ", toolCall.function.arguments)

                        console.log("Product Search - Name:", name, "SKU:", sku, "Product Number:", productNumber);

                        try {
                            // Build query params
                            const params = new URLSearchParams();
                            if (name) params.append('name', name);
                            if (sku) params.append('sku', sku);
                            if (productNumber) params.append('productNumber', productNumber);

                            const productResponse = await axios.get(
                                `http://localhost:5400/magento/get-magento-products?${params.toString()}`
                            );

                            const productData = productResponse.data;

                            if (productData.success) {
                                // Single product (searched by SKU/productNumber)
                                if (productData.product) {
                                    const product = productData.product;

                                    const productDetails = {
                                        name: product.name,
                                        sku: product.sku,
                                        price: product.price,
                                        description: product.custom_attributes?.find((attr: any) => attr.attribute_code === 'description')?.value || 'No description available',
                                        status: product.status === 1 ? 'In Stock' : 'Out of Stock',
                                        type: product.type_id,
                                        weight: product.weight,
                                        customAttributes: product.custom_attributes
                                    };

                                    const productSummary = `[PRODUCT_DATA]${JSON.stringify(productDetails)}[/PRODUCT_DATA]
                                        INITIAL_RESPONSE: I found ${product.name}! It's priced at $${product.price} and is currently ${product.status === 1 ? 'in stock' : 'out of stock'}.`;

                                    return {
                                        toolCallId: toolCall.id,
                                        result: productSummary
                                    };
                                }

                                if (productData.products && productData.products.length > 0) {
                                    const products = productData.products.slice(0, 5); 

                                    const productsDetails = products.map((product: any) => ({
                                        name: product.name,
                                        sku: product.sku,
                                        price: product.price,
                                        status: product.status === 1 ? 'In Stock' : 'Out of Stock'
                                    }));

                                    const productsList = products.map((p: any, index: number) =>
                                        `${index + 1}. ${p.name} - $${p.price} - ${p.status === 1 ? 'In Stock' : 'Out of Stock'}`
                                    ).join('\n');

                                    const productSummary = `[PRODUCTS_DATA]${JSON.stringify(productsDetails)}[/PRODUCTS_DATA]
                                        INITIAL_RESPONSE: I found ${productData.total_count} products matching your search. Here are the top results:
                                        ${productsList}
                                    Would you like more details about any of these products?`;

                                    return {
                                        toolCallId: toolCall.id,
                                        result: productSummary
                                    };
                                }

                                return {
                                    toolCallId: toolCall.id,
                                    result: "I couldn't find any products matching that search. Could you try a different product name or be more specific?"
                                };
                            } else {
                                return {
                                    toolCallId: toolCall.id,
                                    result: productData.message || "I couldn't find any products matching that search."
                                };
                            }

                        } catch (productError: any) {
                            console.error("Error fetching product:", productError);
                            return {
                                toolCallId: toolCall.id,
                                result: "Sorry, I'm having trouble searching for products right now. Please try again in a moment."
                            };
                        }
                    }

                    return {
                        toolCallId: toolCall.id,
                        result: "I'm not sure how to handle that request."
                    };
                })
            );

            return res.status(200).json({ results });
        }

        return res.status(200).json({ received: true });

    } catch (error: any) {
        console.error("VAPI webhook error:", error);
        return res.status(200).json({
            results: [{
                result: "I apologize, but I encountered an error while processing your request."
            }]
        });
    }
};