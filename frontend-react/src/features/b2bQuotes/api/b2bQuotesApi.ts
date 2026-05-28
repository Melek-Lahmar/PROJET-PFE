import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  ConvertQuoteToOrderResult,
  CreateQuoteRequestDto,
  QuoteDecisionRequestDto,
  QuoteDetailDto,
  QuoteListItemDto,
  AddQuoteCommentPayload,
} from "../types/b2bQuotes";

export async function createQuote(payload: CreateQuoteRequestDto) {
  const { data } = await axiosClient.post<QuoteDetailDto>(endpoints.b2bQuotes, payload);
  return data;
}

export async function listQuotes(params?: { status?: string | null }) {
  const { data } = await axiosClient.get<QuoteListItemDto[]>(endpoints.b2bQuotes, {
    params: params?.status ? { status: params.status } : undefined,
  });
  return data;
}

export async function getQuote(piece: string) {
  const { data } = await axiosClient.get<QuoteDetailDto>(endpoints.b2bQuoteByPiece(piece));
  return data;
}

export async function listMyQuotes() {
  const { data } = await axiosClient.get<QuoteListItemDto[]>(endpoints.b2bMyQuotes);
  return data;
}

export async function acceptQuote(piece: string) {
  const { data } = await axiosClient.post<ConvertQuoteToOrderResult>(endpoints.b2bQuoteAccept(piece), {});
  return data;
}

export async function refuseQuote(piece: string, reason?: string | null) {
  const payload: QuoteDecisionRequestDto = { reason };
  const { data } = await axiosClient.post<QuoteDetailDto>(endpoints.b2bQuoteRefuse(piece), payload);
  return data;
}

export async function addQuoteComment(piece: string, payload: AddQuoteCommentPayload) {
  const { data } = await axiosClient.post<QuoteDetailDto>(endpoints.b2bQuoteComment(piece), payload);
  return data;
}

export async function cancelQuote(piece: string, reason?: string | null) {
  const payload: QuoteDecisionRequestDto = { reason };
  const { data } = await axiosClient.post<QuoteDetailDto>(endpoints.b2bQuoteCancel(piece), payload);
  return data;
}

export async function convertQuoteToOrder(piece: string) {
  const { data } = await axiosClient.post<ConvertQuoteToOrderResult>(endpoints.b2bQuoteConvert(piece), {});
  return data;
}
