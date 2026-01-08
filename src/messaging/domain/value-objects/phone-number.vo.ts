export class PhoneNumber {
  private readonly value: string;

  constructor(phoneNumber: string) {
    this.validate(phoneNumber);
    this.value = this.normalize(phoneNumber);
  }

  private validate(phoneNumber: string): void {
    if (!phoneNumber || phoneNumber.trim() === "") {
      throw new Error("Phone number is required");
    }

    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 15) {
      throw new Error("Invalid phone number format");
    }
  }

  private normalize(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, "");
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
