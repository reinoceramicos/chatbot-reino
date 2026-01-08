"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneNumber = void 0;
class PhoneNumber {
    value;
    constructor(phoneNumber) {
        this.validate(phoneNumber);
        this.value = this.normalize(phoneNumber);
    }
    validate(phoneNumber) {
        if (!phoneNumber || phoneNumber.trim() === "") {
            throw new Error("Phone number is required");
        }
        const cleaned = phoneNumber.replace(/\D/g, "");
        if (cleaned.length < 10 || cleaned.length > 15) {
            throw new Error("Invalid phone number format");
        }
    }
    normalize(phoneNumber) {
        return phoneNumber.replace(/\D/g, "");
    }
    getValue() {
        return this.value;
    }
    toString() {
        return this.value;
    }
}
exports.PhoneNumber = PhoneNumber;
