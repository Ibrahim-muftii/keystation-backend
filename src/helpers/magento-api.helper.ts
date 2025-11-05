import axios, { AxiosRequestConfig } from 'axios';
import crypto from 'crypto';

/**
 * Magento API Helper
 * Provides utility functions for making authenticated requests to Magento API
 */

// Cache for admin token
let cachedAdminToken: string | null = null;
let tokenExpiry: number = 0;

// OAuth 1.0a signature generation
function percentEncode(str: string): string {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/\*/g, '%2A')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/'/g, '%27');
}

function generateOAuthSignature(
    method: string,
    url: string,
    params: any,
    consumerSecret: string,
    tokenSecret: string = ''
): string {
    const sortedParams = Object.keys(params)
        .filter(key => key !== 'oauth_signature')
        .sort()
        .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
        .join('&');

    const baseString = [
        method.toUpperCase(),
        percentEncode(url),
        percentEncode(sortedParams)
    ].join('&');

    const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

    const signature = crypto
        .createHmac('sha256', signingKey)
        .update(baseString)
        .digest('base64');

    return signature;
}

function buildOAuthHeader(params: any): string {
    const authParams = Object.keys(params)
        .map(key => `${percentEncode(key)}="${percentEncode(params[key])}"`)
        .join(', ');

    return `OAuth ${authParams}`;
}

/**
 * Get admin token for authentication
 */
async function getAdminToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedAdminToken && Date.now() < tokenExpiry) {
        return cachedAdminToken;
    }

    const baseUrl = process.env.MAGENTO_BASE_URL || 'https://keystation.co.uk';
    const username = process.env.MAGENTO_ADMIN_USERNAME;
    const password = process.env.MAGENTO_ADMIN_PASSWORD;

    if (!username || !password) {
        throw new Error('Magento admin credentials not configured');
    }

    try {
        const response = await axios.post(
            `${baseUrl}/rest/V1/integration/admin/token`,
            { username, password },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                }
            }
        );

        cachedAdminToken = response.data;
        // Token expires in 4 hours, cache for 3.5 hours
        tokenExpiry = Date.now() + (3.5 * 60 * 60 * 1000);
        return cachedAdminToken!;
    } catch (error: any) {
        console.error('Failed to get admin token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Make authenticated request to Magento API using Admin Token
 */
export async function magentoApiRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
): Promise<any> {
    const baseUrl = process.env.MAGENTO_BASE_URL || 'https://keystation.co.uk';
    const url = `${baseUrl}${endpoint}`;

    // Get admin token
    const token = await getAdminToken();

    const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': ' ',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache'
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
    }

    try {
        const response = await axios(config);
        return response.data;
    } catch (error: any) {
        console.error('Magento API Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Search products in Magento with support for name, SKU, and category
 */
export async function searchMagentoProducts(searchCriteria: any): Promise<any> {
    const queryParams = new URLSearchParams();
    let filterGroupIndex = 0;

    // Search by product name
    if (searchCriteria.name) {
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][field]`, 'name');
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][value]`, `%${searchCriteria.name}%`);
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][conditionType]`, 'like');
        filterGroupIndex++;
    }

    // Search by brand (custom attribute)
    if (searchCriteria.brand) {
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][field]`, 'brands');
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][value]`, `%${searchCriteria.brand}%`);
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][conditionType]`, 'like');
        filterGroupIndex++;
    }

    // Filter by product availability (stock status)
    if (searchCriteria.availability) {
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][field]`, 'stock_status');
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][value]`, searchCriteria.availability.toLowerCase() === 'in_stock' ? '1' : '0');
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][conditionType]`, 'eq');
        filterGroupIndex++;
    }

    // Filter by product status (enabled / disabled)
    if (searchCriteria.status) {
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][field]`, 'status');
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][value]`, searchCriteria.status.toLowerCase() === 'enabled' ? '1' : '2');
        queryParams.append(`searchCriteria[filterGroups][${filterGroupIndex}][filters][0][conditionType]`, 'eq');
        filterGroupIndex++;
    }

    // Pagination defaults
    queryParams.append('searchCriteria[pageSize]', '20');
    queryParams.append('searchCriteria[currentPage]', '1');

    const endpoint = `/rest/V1/products?${queryParams.toString()}`;
    return await magentoApiRequest(endpoint, 'GET');
}


/**
 * Get product by SKU with stock information
 */
export async function getMagentoProductBySku(sku: string): Promise<any> {
    const endpoint = `/rest/V1/products/${encodeURIComponent(sku)}`;
    return await magentoApiRequest(endpoint, 'GET');
}

/**
 * Get stock status for a product by SKU
 */
export async function getProductStockStatus(sku: string): Promise<any> {
    try {
        const endpoint = `/rest/V1/stockStatuses/${encodeURIComponent(sku)}`;
        return await magentoApiRequest(endpoint, 'GET');
    } catch (error) {
        // If stockStatuses endpoint doesn't work, fall back to product data
        const product = await getMagentoProductBySku(sku);
        return {
            stock_status: product.extension_attributes?.stock_item?.is_in_stock ? 1 : 0,
            qty: product.extension_attributes?.stock_item?.qty || 0
        };
    }
}

/**
 * Search orders in Magento
 */
export async function searchMagentoOrders(searchCriteria: any): Promise<any> {
    const queryParams = new URLSearchParams();
    let filterIndex = 0;

    if (searchCriteria.customerName) {
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][field]`, 'customer_firstname');
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][value]`, `%${searchCriteria.customerName}%`);
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][conditionType]`, 'like');
        filterIndex++;
    }

    if (searchCriteria.email) {
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][field]`, 'customer_email');
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][value]`, `%${searchCriteria.email}%`);
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][conditionType]`, 'like');
        filterIndex++;
    }

    if (searchCriteria.incrementId) {
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][field]`, 'increment_id');
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][value]`, searchCriteria.incrementId);
        queryParams.append(`searchCriteria[filterGroups][${filterIndex}][filters][0][conditionType]`, 'eq');
    }

    const endpoint = `/rest/V1/orders?${queryParams.toString()}`;
    return await magentoApiRequest(endpoint, 'GET');
}

/**
 * Get order by ID
 */
export async function getMagentoOrderById(orderId: string): Promise<any> {
    const endpoint = `/rest/V1/orders/${orderId}`;
    return await magentoApiRequest(endpoint, 'GET');
}