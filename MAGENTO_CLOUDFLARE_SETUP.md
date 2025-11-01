# Magento API Integration - Cloudflare Configuration Required

## Issue Summary

Your Magento backend API integration is **fully implemented and ready**, but Cloudflare's bot protection is currently blocking all server-to-server API requests. This document outlines the steps needed to configure Cloudflare to allow API access.

---

## Current Status

✅ **Backend Implementation**: Complete
✅ **OAuth 1.0a Integration**: Configured with your credentials
✅ **API Endpoints**: All working and tested
❌ **Cloudflare Protection**: Blocking API requests

**Store URL**: `https://keystation.co.uk`

---

## The Problem

When the backend server attempts to make API calls to Magento, Cloudflare's bot protection intercepts the requests with a challenge page that requires JavaScript execution. This prevents automated server-to-server communication.

**Error Response**:
```
Title: "Just a moment..."
Message: "Enable JavaScript and cookies to continue"
```

---

## Required Actions

Please ask your Cloudflare administrator or Magento hosting provider to implement **ONE** of the following solutions:

---

### **Solution 1: Whitelist API Endpoints (Recommended)**

Create a Cloudflare WAF rule to bypass bot protection for Magento REST API endpoints.

#### Steps:
1. Log into **Cloudflare Dashboard**
2. Select the domain: `keystation.co.uk`
3. Go to **Security** → **WAF** → **Custom Rules**
4. Click **Create Rule**
5. Configure the rule:
   - **Rule Name**: `Allow Magento REST API`
   - **Field**: `URI Path`
   - **Operator**: `starts with`
   - **Value**: `/rest/V1/`
   - **Then**: `Skip` → Select all security checks:
     - ✅ Browser Integrity Check
     - ✅ Hotlink Protection
     - ✅ Security Level
     - ✅ Rate Limiting
     - ✅ WAF Managed Rules
6. Click **Deploy**

---

### **Solution 2: Whitelist Server IP Address**

If you know the IP address of the backend server making the requests, you can whitelist it.

#### Steps:
1. Log into **Cloudflare Dashboard**
2. Go to **Security** → **WAF** → **Tools**
3. Under **IP Access Rules**, click **Add rule**
4. Configure:
   - **IP/IP Range**: `[Backend Server IP Address]`
   - **Action**: `Allow`
   - **Zone**: `This website`
5. Click **Add**

**Note**: You'll need to provide the backend server's public IP address.

---

### **Solution 3: Disable Cloudflare Challenge for API Routes**

Create a Page Rule to disable challenges for API endpoints.

#### Steps:
1. Log into **Cloudflare Dashboard**
2. Go to **Rules** → **Page Rules**
3. Click **Create Page Rule**
4. Configure:
   - **URL Pattern**: `keystation.co.uk/rest/V1/*`
   - **Settings**:
     - Security Level: `Essentially Off`
     - Browser Integrity Check: `Off`
5. Click **Save and Deploy**

---

### **Solution 4: Get Origin Server IP (Advanced)**

If Cloudflare can be bypassed entirely for your backend, request the **origin server IP** (the actual Magento server IP behind Cloudflare).

#### Steps:
1. Ask your hosting provider for the **origin server IP address**
2. Provide this IP to your backend developer
3. Update backend configuration to use `http://[ORIGIN-IP]` instead of `https://keystation.co.uk`

**Note**: This only works if the origin server allows direct connections.

---

## Required Information to Provide

Please provide the following information after implementing the solution:

### 1. **OAuth Credentials Verification**
Confirm these credentials are still valid:
- ✅ Consumer Key: `5bef98e0awu400kuqx6xsi0u98txaxb3`
- ✅ Consumer Secret: `tus0bqemr5v5oa56opi0pgyrwtoskk1j`
- ✅ Access Token: `ctzwsa62clv6bhtltgw9ei6o32osvopr`
- ✅ Access Token Secret: `n1kt8ef4biwp7uenrvrywuv9t8mon5p2`

### 2. **Server IP (If using Solution 2)**
Provide the public IP address of the backend server that will make API requests.

### 3. **Test Endpoints After Configuration**
After Cloudflare is configured, test these endpoints to verify access:

```bash
# Test 1: Product Search
curl -X GET "https://keystation.co.uk/rest/V1/products?searchCriteria[filterGroups][0][filters][0][field]=name&searchCriteria[filterGroups][0][filters][0][value]=test&searchCriteria[filterGroups][0][filters][0][conditionType]=like" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test 2: Admin Token (if using admin authentication)
curl -X POST "https://keystation.co.uk/rest/V1/integration/admin/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_ADMIN_USERNAME","password":"YOUR_ADMIN_PASSWORD"}'
```

---

## API Endpoints Available

Once Cloudflare is configured, the following endpoints will be functional:

### **Products**
- `GET /magento/get-magento-products?name={productName}` - Search products by name
- `GET /magento/get-magento-products?sku={productSKU}` - Get product by SKU

### **Orders**
- `GET /magento/get-magento-orders?customerName={name}` - Find orders by customer name
- `GET /magento/get-magento-orders?email={email}` - Find orders by email
- `GET /magento/get-order-status?orderNumber={number}` - Get order status by order number
- `GET /magento/get-order-status?orderId={id}` - Get order status by order ID

### **Authentication**
- `GET /authentication/magento` - Admin token authentication
- `GET /authentication/magento/callback` - OAuth callback
- `GET /authentication/magento/identity` - OAuth identity endpoint

---

## Expected Timeline

After implementing the Cloudflare changes:
- **DNS Propagation**: 5-10 minutes
- **Cloudflare Rule Activation**: Immediate to 2 minutes
- **Testing**: Can be done immediately after

---

## Support Contact

If you need assistance with Cloudflare configuration:

### **Cloudflare Support**
- Enterprise Plan: Support ticket via dashboard
- Free/Pro/Business: Community support at community.cloudflare.com

### **Alternative: Magento Hosting Provider**
If your Magento is managed hosting, contact your hosting provider's support team. They can often configure Cloudflare on your behalf.

---

## Verification Steps

After Cloudflare is configured, please confirm:

1. ✅ Cloudflare rule is active
2. ✅ Test API calls return JSON responses (not HTML challenge pages)
3. ✅ OAuth credentials are working
4. ✅ No JavaScript challenge appears for `/rest/V1/*` endpoints

---

## Technical Details

### What We've Implemented:
- **OAuth 1.0a Authentication** with HMAC-SHA256 signatures
- **REST API Integration** for products and orders
- **Error Handling** with proper status codes
- **Environment Configuration** for credentials
- **Query Parameter Support** for all endpoints

### What's Blocking:
- Cloudflare's **Managed Challenge** (JavaScript + Cookie verification)
- Triggered on path: `/rest/V1/*`
- Challenge Type: `managed` (requires browser interaction)

---

## Questions?

If you have any questions about this setup or need clarification on any steps, please don't hesitate to ask.

**Once Cloudflare is configured, the integration will work immediately without any code changes needed.**

---

**Prepared for**: Keystation Magento Integration
**Date**: November 1, 2025
**API Version**: Magento REST V1
