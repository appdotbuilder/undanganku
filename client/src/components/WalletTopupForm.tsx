
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, CreditCard, Smartphone, Building2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { CreateWalletTopupInput } from '../../../server/src/schema';

interface WalletTopupFormProps {
  onSubmit: (data: CreateWalletTopupInput) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

const PAYMENT_METHODS = [
  { id: 'bank_transfer', name: 'Transfer Bank', icon: Building2, description: 'BCA, Mandiri, BNI, BRI' },
  { id: 'e_wallet', name: 'E-Wallet', icon: Smartphone, description: 'GoPay, OVO, DANA, ShopeePay' },
  { id: 'virtual_account', name: 'Virtual Account', icon: CreditCard, description: 'VA BCA, Mandiri, BNI' }
];

const PRESET_AMOUNTS = [50000, 100000, 250000, 500000, 1000000, 2000000];

export function WalletTopupForm({ onSubmit, onClose, isLoading }: WalletTopupFormProps) {
  const [formData, setFormData] = useState<CreateWalletTopupInput>({
    amount: 0,
    payment_method: '',
    payment_proof_url: null
  });

  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleAmountPreset = (amount: number) => {
    setFormData((prev: CreateWalletTopupInput) => ({ ...prev, amount }));
  };

  const selectedPaymentMethod = PAYMENT_METHODS.find(method => method.id === selectedMethod);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-green-500" />
            <span>💰 Top Up E-Wallet</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💵 Pilih Nominal Top Up</CardTitle>
              <CardDescription>Masukkan jumlah saldo yang ingin ditambahkan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESET_AMOUNTS.map((amount: number) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={formData.amount === amount ? "default" : "outline"}
                    onClick={() => handleAmountPreset(amount)}
                    className="h-auto py-3 flex flex-col items-center"
                  >
                    <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_amount">💰 Atau masukkan nominal custom</Label>
                <Input
                  id="custom_amount"
                  type="number"
                  min="10000"
                  step="1000"
                  value={formData.amount || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateWalletTopupInput) => ({ 
                      ...prev, 
                      amount: parseInt(e.target.value) || 0 
                    }))
                  }
                  placeholder="Minimal Rp 10.000"
                />
                {formData.amount > 0 && (
                  <p className="text-sm text-gray-600">
                    Total yang akan ditop up: <span className="font-semibold text-green-600">
                      {formatCurrency(formData.amount)}
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💳 Metode Pembayaran</CardTitle>
              <CardDescription>Pilih metode pembayaran yang akan digunakan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedMethod}
                onValueChange={(value: string) => {
                  setSelectedMethod(value);
                  setFormData((prev: CreateWalletTopupInput) => ({ ...prev, payment_method: value }));
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-xs text-gray-500">{method.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedPaymentMethod && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <selectedPaymentMethod.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-blue-800">
                        Instruksi Pembayaran - {selectedPaymentMethod.name}
                      </h4>
                      {selectedMethod === 'bank_transfer' && (
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>1. Transfer ke rekening berikut:</p>
                          <p className="font-mono bg-white p-2 rounded">
                            BCA: 1234567890<br />
                            A.n: Wedding Invitation CMS
                          </p>
                          <p>2. Simpan bukti transfer</p>
                          <p>3. Upload bukti transfer di form ini</p>
                        </div>
                      )}
                      {selectedMethod === 'e_wallet' && (
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>1. Buka aplikasi e-wallet Anda</p>
                          <p>2. Transfer ke nomor: <span className="font-mono">081234567890</span></p>
                          <p>3. Screenshot bukti transfer</p>
                          <p>4. Upload screenshot di form ini</p>
                        </div>
                      )}
                      {selectedMethod === 'virtual_account' && (
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>1. Gunakan Virtual Account berikut:</p>
                          <p className="font-mono bg-white p-2 rounded">
                            VA BCA: 70001234567890
                          </p>
                          <p>2. Transfer melalui ATM/Mobile Banking</p>
                          <p>3. Simpan bukti transfer</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Proof Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📸 Bukti Pembayaran</CardTitle>
              <CardDescription>Upload bukti transfer atau screenshot pembayaran (opsional, bisa diupload nanti)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_proof">🖼️ URL Bukti Pembayaran (Opsional)</Label>
                <Input
                  id="payment_proof"
                  type="url"
                  value={formData.payment_proof_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateWalletTopupInput) => ({ 
                      ...prev, 
                      payment_proof_url: e.target.value || null 
                    }))
                  }
                  placeholder="https://example.com/bukti-transfer.jpg"
                />
                <p className="text-xs text-gray-500">
                  💡 Tips: Upload gambar ke layanan seperti imgur.com atau Google Drive (public link), 
                  lalu paste URL-nya di sini
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Catatan Penting:</strong> Top up akan diproses secara manual oleh admin. 
                  Proses verifikasi membutuhkan waktu 1-24 jam setelah pembayaran dikonfirmasi.
                  Pastikan nominal transfer sesuai dengan yang Anda pilih.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || formData.amount < 10000 || !formData.payment_method}
              className="bg-green-500 hover:bg-green-600"
            >
              {isLoading ? 'Memproses...' : '💰 Submit Top Up'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
