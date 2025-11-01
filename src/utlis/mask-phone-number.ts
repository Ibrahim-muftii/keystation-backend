export function maskPhoneNumber(phoneNumber:string) {
    if (!phoneNumber || phoneNumber.length <= 5) return phoneNumber;
    return phoneNumber.slice(0, -5) + 'xxxxx';
}