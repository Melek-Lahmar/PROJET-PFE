export type BonLivraisonLine = {
  articleRef: string;
  designation?: string | null;
  qty: number;
  unitPrice: number;
  amountHT: number;
  amountTTC: number;
};

export type BonLivraison = {
  piece: string;
  date?: string | null;

  sourceBcPiece?: string | null;

  clientCode: string;
  depotNo: number;

  status?: string | null;

  totalHT: number;
  totalTTC: number;
  fraisLivraison: number;
  timbreFiscal: number;
  netAPayer: number;

  deliveryType?: string | null;
  paymentMethod?: string | null;

  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  latitude?: string | null;
  longitude?: string | null;

  lines: BonLivraisonLine[];
};

export type StockInsufficientItem = {
  articleRef: string;
  requestedQty: number;
  availableQty: number;
  depotNo: number;
};

export type StockInsufficientResponse = {
  message: string;
  items: StockInsufficientItem[];
};