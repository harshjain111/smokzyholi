

## Add "Cover Slip" Payment Mode

### What changes are needed

1. **Database**: Update the `orders_payment_mode_check` constraint to allow `'cover_slip'` alongside `'cash'`, `'upi'`, and `'due'`.

2. **`src/components/AddSale.tsx`**:
   - Add "Cover Slip" as a payment mode button (with a 🎫 icon) in the payment step grid, alongside Cash and UPI.
   - Update the confirm button logic: when `paymentMode === "cover_slip"`, show "🎫 CONFIRM COVER SLIP" with distinct styling (e.g., a green/secondary style since payment is already collected).

3. **`src/components/Reports.tsx`**: Add a Cover Slip sales stat card to the reports breakdown, filtering orders where `payment_mode === 'cover_slip'`.

### Notes
- Cover Slip orders are pre-paid (not due), so `payment_due` stays `false`.
- The payment mode value stored will be `"cover_slip"`.

