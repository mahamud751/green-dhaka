export type Language = 'en' | 'bn';
export type Area = {
  id: string;
  name: string;
  nameBn: string;
  lat: number;
  lng: number;
  radiusKm: number;
};
export type Item = {
  id: string;
  categoryId: string;
  name: string;
  nameBn: string;
  unit: 'kg' | 'pc';
};
export type Category = {
  id: string;
  name: string;
  nameBn: string;
  icon: string;
  color: string;
  items: Item[];
};
export type Rate = {
  id: string;
  itemId: string;
  price: number;
  effectiveFrom: string;
  item: Item & { category: Category };
};
export type Address = {
  id: string;
  areaId: string;
  label: string;
  line1: string;
  landmark: string;
  lat: number;
  lng: number;
  area: Area;
};
export type Partner = {
  id: string;
  name: string;
  rating: number;
  photoUrl: string;
  vehicle: string;
  kycStatus: string;
  completedPickups?: number;
  maskedPhone?: string;
  /** Last reported position; only sent while the pickup is in progress. */
  lat?: number;
  lng?: number;
};
export type OrderItem = {
  id: string;
  itemId: string;
  item: Item;
  estimatedQty: string;
  finalQty: string | null;
  lockedRate: number;
  notes: string;
};
export type Order = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  slotStart: string | null;
  estimatedValue: number;
  finalValue: number | null;
  netPayout: number;
  fee: number;
  creditUsed: number;
  cashPaid: boolean;
  weightsApproved: boolean;
  weighingVersion: number;
  hasWeightDifference: boolean;
  handoverOtp?: string;
  partner: Partner | null;
  address: Address;
  items: OrderItem[];
  photos: { url: string; id: string; uploadedBy: string }[];
  ratings: { fromId: string; stars: number }[];
};
export type User = {
  id: string;
  phone: string;
  name: string;
  role: 'SELLER' | 'PARTNER' | 'ADMIN';
  language: Language;
  referralCode: string;
  partner?: { id: string; kycStatus: string; online: boolean };
};
export type Config = {
  pickupFee: number;
  freeThreshold: number;
  minimumOrder: number;
  referralAmount: number;
  supportPhone: string;
  supportWhatsapp: string;
  ratesAreDemo: boolean;
  development: boolean;
};
export type Draft = { itemId: string; quantity: string; notes: string };
export type Route = { name: string; id?: string; param?: string };
