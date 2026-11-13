import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdvancePaymentOrder,
  createPaymentOrder,
  createWaiverRequest,
  listMyFeeInvoices,
  listMyPayments,
  verifyPayment,
} from '@/lib/api/payments';
import { listMyChildren } from '@/lib/api/children';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { openRazorpayCheckout } from '@/lib/razorpayCheckout';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { SkeletonTable } from '@/components/ui/Skeleton';
import type { FeeInvoice, Payment } from '@/types/payment';

const PAYMENTS_PAGE_SIZE = 20;

const DISCOUNT_TIERS: { months: number; percent: number }[] = [
  { months: 3, percent: 5 },
  { months: 6, percent: 8 },
  { months: 12, percent: 12 },
];

function discountPercentFor(months: number): number {
  return DISCOUNT_TIERS.filter((t) => months >= t.months).reduce((max, t) => Math.max(max, t.percent), 0);
}

function invoiceStatusTone(invoice: FeeInvoice): 'success' | 'warning' | 'danger' | 'neutral' {
  if (invoice.status === 'PAID') return 'success';
  if (invoice.status === 'OVERDUE') return 'danger';
  if (invoice.status === 'CANCELLED') return 'neutral';
  return 'warning';
}

function WaiverRequestForm({ invoice, onDone }: { invoice: FeeInvoice; onDone: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => createWaiverRequest(invoice.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-waivers'] });
      toast.success(t('parentPay.waiverSubmitted'));
      onDone();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentPay.waiverFailed'))),
  });

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <label className="text-sm font-medium text-slate-700">
        {t('parentPay.waiverQuestion')}
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder={t('parentPay.waiverPlaceholder')}
      />
      <div className="flex gap-2">
        <Button
          isLoading={mutation.isPending}
          disabled={reason.trim().length === 0}
          onClick={() => mutation.mutate()}
        >
          {t('parentPay.submitForReview')}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

function ReceiptView({ payment }: { payment: Payment }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  return (
    <div className="mt-2 flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-4 text-sm print:border-none">
      <p className="text-base font-semibold text-slate-900">{t('parentPay.receiptTitle')}</p>
      <p className="text-slate-500">{t('parentPay.receiptNo', { number: payment.receiptNumber ?? '—' })}</p>
      <div className="mt-2 grid grid-cols-2 gap-y-1">
        <span className="text-slate-500">{t('common.date')}</span>
        <span>{new Date(payment.createdAt).toLocaleString(locale)}</span>
        <span className="text-slate-500">{t('parentPay.amountPaid')}</span>
        <span className="font-medium">₹{payment.amount.toFixed(2)}</span>
        {payment.discountAmount > 0 && (
          <>
            <span className="text-slate-500">{t('parentPay.discountApplied')}</span>
            <span>₹{payment.discountAmount.toFixed(2)}</span>
          </>
        )}
        <span className="text-slate-500">{t('parentPay.monthsCovered')}</span>
        <span>{payment.monthsCovered}</span>
        <span className="text-slate-500">{t('parentPay.paymentMode')}</span>
        <span>{payment.mode ?? t('common.unknown')}</span>
        <span className="text-slate-500">{t('common.status')}</span>
        <span>{t(`enums.payStatus.${payment.status}`, { defaultValue: payment.status })}</span>
      </div>
      <Button variant="secondary" className="mt-3 w-fit print:hidden" onClick={() => window.print()}>
        {t('parentPay.printSave')}
      </Button>
    </div>
  );
}

export function ParentPaymentsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  const payStatusLabel = (status: string) => t(`enums.payStatus.${status}`, { defaultValue: status });
  const email = useAuthStore((state) => state.email);
  const queryClient = useQueryClient();
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);
  const [waiverInvoiceId, setWaiverInvoiceId] = useState<number | null>(null);
  const [advanceChildId, setAdvanceChildId] = useState<number | ''>('');
  const [advanceMonths, setAdvanceMonths] = useState(3);
  const [receiptPaymentId, setReceiptPaymentId] = useState<number | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(0);

  const { data: invoices, isLoading: invoicesLoading } = useQuery({ queryKey: ['my-fee-invoices'], queryFn: listMyFeeInvoices });
  const { data: paymentsPageData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['my-payments', paymentsPage],
    queryFn: () => listMyPayments(paymentsPage, PAYMENTS_PAGE_SIZE),
  });
  const payments = paymentsPageData?.content;
  const { data: children } = useQuery({ queryKey: ['my-children'], queryFn: listMyChildren });

  async function completeCheckout(order: { paymentId: number; razorpayOrderId: string; razorpayKeyId: string; amount: number }, description: string) {
    const result = await openRazorpayCheckout({
      keyId: order.razorpayKeyId,
      orderId: order.razorpayOrderId,
      amountInRupees: order.amount,
      description,
      prefillEmail: email ?? undefined,
    });
    await verifyPayment(order.paymentId, {
      razorpayOrderId: result.razorpay_order_id,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    });
    queryClient.invalidateQueries({ queryKey: ['my-fee-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    toast.success(t('parentPay.paymentSuccess'));
  }

  const payMutation = useMutation({
    mutationFn: async (invoice: FeeInvoice) => {
      const order = await createPaymentOrder([invoice.id]);
      await completeCheckout(order, t('parentPay.feeFor', { month: invoice.billingMonth }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentPay.startFailed'))),
    onSettled: () => setPayingInvoiceId(null),
  });

  const advancePayMutation = useMutation({
    mutationFn: async () => {
      if (advanceChildId === '') throw new Error(t('parentPay.selectChildFirst'));
      const order = await createAdvancePaymentOrder(advanceChildId, advanceMonths);
      await completeCheckout(order, t('parentPay.advanceDescription', { count: advanceMonths }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentPay.advanceStartFailed'))),
  });

  const discountPercent = discountPercentFor(advanceMonths);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('parentPay.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('parentPay.yourFees')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t('parentPay.feesHint')}
          </p>
        </CardHeader>
        <CardBody>
          {invoicesLoading && <SkeletonTable rows={3} columns={3} />}
          <ul className="flex flex-col divide-y divide-slate-100">
            {invoices?.map((invoice) => (
              <li key={invoice.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{invoice.billingMonth}</p>
                    <p className="text-sm text-slate-500">
                      ₹{invoice.baseAmount.toFixed(2)}
                      {invoice.discountAmount > 0 && ` ${t('parentPay.minusDiscount', { amount: invoice.discountAmount.toFixed(2) })}`}
                      {invoice.lateFeeAmount > 0 && ` ${t('parentPay.plusLateFee', { amount: invoice.lateFeeAmount.toFixed(2) })}`}
                      {' = '}
                      <span className="font-semibold">₹{invoice.totalAmount.toFixed(2)}</span>
                      {' · '}
                      {t('parentPay.dueOn', { date: invoice.dueDate })}
                      {invoice.lateFeeWaived && ` · ${t('parentPay.lateFeeWaived')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={invoiceStatusTone(invoice)}>{payStatusLabel(invoice.status)}</Badge>
                    {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                      <Button
                        isLoading={payMutation.isPending && payingInvoiceId === invoice.id}
                        onClick={() => {
                          setPayingInvoiceId(invoice.id);
                          payMutation.mutate(invoice);
                        }}
                      >
                        {t('parentPay.pay', { amount: invoice.totalAmount.toFixed(2) })}
                      </Button>
                    )}
                    {invoice.lateFeeAmount > 0 && !invoice.lateFeeWaived && (
                      <Button
                        variant="secondary"
                        onClick={() => setWaiverInvoiceId(waiverInvoiceId === invoice.id ? null : invoice.id)}
                      >
                        {t('parentPay.requestWaiver')}
                      </Button>
                    )}
                  </div>
                </div>
                {waiverInvoiceId === invoice.id && (
                  <WaiverRequestForm invoice={invoice} onDone={() => setWaiverInvoiceId(null)} />
                )}
              </li>
            ))}
            {invoices?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('parentPay.noFees')}</p>}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('parentPay.advanceTitle')}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t('parentPay.advanceHint')}
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label={t('parentPay.child')}
              value={advanceChildId}
              onChange={(e) => setAdvanceChildId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{t('parentPay.select')}</option>
              {children?.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </option>
              ))}
            </Select>
            <Select
              label={t('parentPay.months')}
              value={advanceMonths}
              onChange={(e) => setAdvanceMonths(Number(e.target.value))}
            >
              {[2, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {t('parentPay.monthsOption', { count: m })}
                </option>
              ))}
            </Select>
            <p className="text-sm text-slate-600">
              {discountPercent > 0 ? t('parentPay.percentOff', { percent: discountPercent }) : t('parentPay.noDiscount')}
            </p>
            <Button
              isLoading={advancePayMutation.isPending}
              disabled={advanceChildId === ''}
              onClick={() => advancePayMutation.mutate()}
            >
              {t('parentPay.payAdvance')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('parentPay.historyTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          {paymentsLoading && <SkeletonTable rows={5} columns={3} />}
          <ul className="flex flex-col divide-y divide-slate-100">
            {payments?.map((payment) => (
              <li key={payment.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      ₹{payment.amount.toFixed(2)}
                      {payment.discountAmount > 0 && ` ${t('parentPay.saved', { amount: payment.discountAmount.toFixed(2) })}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      {payment.receiptNumber ?? t('parentPay.noReceipt')} · {payment.mode ?? t('parentPay.modeUnknown')} ·{' '}
                      {new Date(payment.createdAt).toLocaleString(locale)} ·{' '}
                      {t('parentPay.monthCount', { count: payment.monthsCovered })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={payment.status === 'SUCCESS' ? 'success' : payment.status === 'FAILED' ? 'danger' : 'neutral'}>
                      {payStatusLabel(payment.status)}
                    </Badge>
                    {payment.status === 'SUCCESS' && (
                      <Button
                        variant="secondary"
                        onClick={() => setReceiptPaymentId(receiptPaymentId === payment.id ? null : payment.id)}
                      >
                        {receiptPaymentId === payment.id ? t('parentPay.hideReceipt') : t('parentPay.viewReceipt')}
                      </Button>
                    )}
                  </div>
                </div>
                {receiptPaymentId === payment.id && <ReceiptView payment={payment} />}
              </li>
            ))}
            {payments?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('parentPay.noPayments')}</p>}
          </ul>
          {paymentsPageData && (
            <Pagination
              className="mt-4"
              page={paymentsPage}
              totalPages={paymentsPageData.totalPages}
              totalElements={paymentsPageData.totalElements}
              pageSize={PAYMENTS_PAGE_SIZE}
              onPageChange={setPaymentsPage}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
