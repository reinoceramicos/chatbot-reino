export interface CustomerProps {
  id?: string;
  waId: string;
  name?: string;
  phone?: string;
  email?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Customer {
  readonly id?: string;
  readonly waId: string;
  readonly name?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: CustomerProps) {
    this.id = props.id;
    this.waId = props.waId;
    this.name = props.name;
    this.phone = props.phone;
    this.email = props.email;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(waId: string, name?: string): Customer {
    return new Customer({ waId, name });
  }
}
