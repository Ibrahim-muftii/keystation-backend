import axios from "axios";
import { Request, Response } from "express";
import TwilioNumbers from "../models/twilioNumbers";

export const vapiWebhook = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;

        console.log("WEBHOOK CALLED - Type:", message?.type);

        // ============================================
        // HANDLE TRANSFER DESTINATION REQUEST
        // ============================================
        if (message?.type === 'transfer-destination-request') {
            console.log("🔄 Transfer destination requested");

            try {
                const numbers = await TwilioNumbers.findAll({
                    attributes: ["id", "phoneNumber"],
                    order: [['id', 'ASC']],
                    raw: true
                }) as any[];

                console.log("📞 Found numbers:", numbers.length);

                if (numbers && numbers.length > 0) {
                    const transferDestinations = numbers.map((num: any, index: number) => ({
                        type: "number",
                        number: num.phoneNumber,
                        message: "Connecting you to our support specialist. Please hold.",
                        description: `Support Specialist ${index + 1}`
                    }));

                    console.log("✅ Returning destinations:", JSON.stringify(transferDestinations, null, 2));

                    return res.status(200).json({
                        destinations: transferDestinations
                    });
                } else {
                    console.log("❌ No transfer numbers available");
                    return res.status(200).json({
                        destination: null
                    });
                }

            } catch (dbError: any) {
                console.error("❌ Database error:", dbError);
                return res.status(200).json({
                    destination: null
                });
            }
        }

        if (message?.type === 'tool-calls') {
            const { toolCalls } = message;
            console.log("🔧 Tool Calls:", toolCalls.length);

            const results = await Promise.all(
                toolCalls.map(async (toolCall: any) => {

                    // ============================================
                    // TRANSFER CALL FUNCTION
                    // ============================================
                    if (toolCall.function.name === 'transferCall') {
                        const { reason } = toolCall.function.arguments;
                        console.log("🔄 Transfer requested - Reason:", reason);

                        return {
                            toolCallId: toolCall.id,
                            result: "Transferring now. Please hold."
                        };
                    }

                    // ============================================
                    // ORDER STATUS FUNCTION
                    // ============================================
                    if (toolCall.function.name === 'getOrderStatus') {
                        const { orderNumber, orderId } = toolCall.function.arguments;
                        console.log("📦 Order lookup:", orderNumber || orderId);

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
INITIAL_RESPONSE: Order ${orderData.orderNumber} - ${orderData.status}. ${orderData.order.items?.length || 0} items, total $${orderData.order.grand_total}.`;

                                return {
                                    toolCallId: toolCall.id,
                                    result: orderSummary
                                };
                            } else {
                                return {
                                    toolCallId: toolCall.id,
                                    result: `Order not found. Please check the number.`
                                };
                            }

                        } catch (orderError: any) {
                            console.error("Error fetching order:", orderError);
                            return {
                                toolCallId: toolCall.id,
                                result: "Can't access orders right now. Try again shortly."
                            };
                        }
                    }

                    // ============================================
                    // PRODUCT SEARCH FUNCTION (ENHANCED WITH ALL FILTERS)
                    // ============================================
                    if (toolCall.function.name === 'searchProduct') {
                        console.log("🔍 Product search:", toolCall.function.arguments);
                        const { name, sku, productNumber, category, brand, brandId, priceMin, priceMax } = toolCall.function.arguments;

                        try {
                            const params = new URLSearchParams();
                            if (name) params.append('name', name);
                            if (sku) params.append('sku', sku);
                            if (productNumber) params.append('productNumber', productNumber);
                            if (category) params.append('category', category);
                            if (brand) params.append('brand', brand);
                            if (brandId) params.append('brandId', brandId);
                            if (priceMin) params.append('priceMin', priceMin);
                            if (priceMax) params.append('priceMax', priceMax);

                            const productResponse = await axios.get(
                                `http://localhost:5400/magento/get-magento-products?${params.toString()}`
                            );

                            const productData = productResponse.data;

                            if (productData.success) {
                                if (productData.product) {
                                    const product = productData.product;
                                    const isInStock = product.status === 1;
                                    const stockQty = product.extension_attributes?.stock_item?.qty || 0;

                                    const productDetails = {
                                        name: product.name,
                                        sku: product.sku,
                                        price: product.price,
                                        inStock: isInStock,
                                        quantity: stockQty,
                                        description: product.custom_attributes?.find((attr: any) => attr.attribute_code === 'description')?.value || 'No description available',
                                        type: product.type_id,
                                        weight: product.weight,
                                    };

                                    const stockStatus = isInStock ? `in stock (${stockQty} available)` : 'out of stock';
                                    const productSummary = `[PRODUCT_DATA]${JSON.stringify(productDetails)}[/PRODUCT_DATA]
INITIAL_RESPONSE: ${product.name} - $${product.price}, ${stockStatus}.`;

                                    return {
                                        toolCallId: toolCall.id,
                                        result: productSummary
                                    };
                                }

                                if (productData.products && productData.products.length > 0) {
                                    const products = productData.products.slice(0, 5);

                                    const productsDetails = products.map((product: any) => {
                                        const isInStock = product.status === 1;
                                        const stockQty = product.extension_attributes?.stock_item?.qty || 0;
                                        return {
                                            name: product.name,
                                            sku: product.sku,
                                            price: product.price,
                                            inStock: isInStock,
                                            quantity: stockQty
                                        };
                                    });

                                    const productsList = products.map((p: any, index: number) => {
                                        const isInStock = p.status === 1;
                                        const stockStatus = isInStock ? 'Available' : 'Out of Stock';
                                        return `${index + 1}. ${p.name} - $${p.price} - ${stockStatus}`;
                                    }).join('\n');

                                    const productSummary = `[PRODUCTS_DATA]${JSON.stringify(productsDetails)}[/PRODUCTS_DATA]
INITIAL_RESPONSE: Found ${productData.total_count} products:
${productsList}`;

                                    return {
                                        toolCallId: toolCall.id,
                                        result: productSummary
                                    };
                                }

                                return {
                                    toolCallId: toolCall.id,
                                    result: "No products found. Try a different search."
                                };
                            } else {
                                return {
                                    toolCallId: toolCall.id,
                                    result: productData.message || "No products found."
                                };
                            }

                        } catch (productError: any) {
                            console.error("Error fetching product:", productError);
                            return {
                                toolCallId: toolCall.id,
                                result: "Can't search products right now. Try again shortly."
                            };
                        }
                    }

                    // ============================================
                    // CHECK PRODUCT AVAILABILITY FUNCTION
                    // ============================================
                    if (toolCall.function.name === 'checkAvailability') {
                        console.log("📊 Availability check:", toolCall.function.arguments);
                        const { productName, sku } = toolCall.function.arguments;

                        try {
                            const params = new URLSearchParams();
                            if (productName) params.append('name', productName);
                            if (sku) params.append('sku', sku);

                            const productResponse = await axios.get(
                                `http://localhost:5400/magento/get-magento-products?${params.toString()}`
                            );

                            const productData = productResponse.data;

                            if (productData.success && productData.product) {
                                const product = productData.product;
                                const isInStock = product.status === 1;
                                const stockQty = product.extension_attributes?.stock_item?.qty || 0;

                                if (isInStock && stockQty > 0) {
                                    return {
                                        toolCallId: toolCall.id,
                                        result: `Yes, ${product.name} is available. We have ${stockQty} in stock.`
                                    };
                                } else {
                                    return {
                                        toolCallId: toolCall.id,
                                        result: `Sorry, ${product.name} is currently out of stock.`
                                    };
                                }
                            } else {
                                return {
                                    toolCallId: toolCall.id,
                                    result: "Product not found. Please check the name or SKU."
                                };
                            }

                        } catch (error: any) {
                            console.error("Error checking availability:", error);
                            return {
                                toolCallId: toolCall.id,
                                result: "Can't check availability right now. Try again shortly."
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

        // ============================================
        // HANDLE TRANSFER UPDATE
        // ============================================
        if (message?.type === 'transfer-update') {
            console.log("📞 Transfer status:", message.status);

            if (message.status === 'complete') {
                console.log("✅ Transfer successful!");
            } else if (message.status === 'failed') {
                console.log("❌ Transfer failed - all numbers unavailable");
            }

            return res.status(200).json({ received: true });
        }

        return res.status(200).json({ received: true });

    } catch (error: any) {
        console.error("❌ VAPI webhook error:", error);
        return res.status(200).json({
            results: [{
                result: "Sorry, I encountered an error processing your request."
            }]
        });
    }
};