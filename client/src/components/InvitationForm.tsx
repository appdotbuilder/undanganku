
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Heart } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Template, Package, Invitation, CreateInvitationInput, UpdateInvitationInput } from '../../../server/src/schema';

interface InvitationFormProps {
  invitation?: Invitation | null;
  templates: Template[];
  packages: Package[];
  onSubmit: (data: CreateInvitationInput | UpdateInvitationInput) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

// Create a unified form data type that includes all possible fields
interface FormData {
  id?: number;
  template_id: number;
  package_id: number;
  title: string;
  bride_name: string;
  groom_name: string;
  wedding_date: Date;
  ceremony_time: string | null;
  ceremony_location: string | null;
  reception_time: string | null;
  reception_location: string | null;
  love_story: string | null;
  background_music_url: string | null;
  gallery_photos: string;
  gallery_videos: string;
  live_stream_url: string | null;
  rsvp_enabled: boolean;
  guest_book_enabled: boolean;
  digital_gift_enabled: boolean;
  qr_checkin_enabled: boolean;
}

export function InvitationForm({ invitation, templates, packages, onSubmit, onClose, isLoading }: InvitationFormProps) {
  const [formData, setFormData] = useState<FormData>(
    invitation
      ? {
          id: invitation.id,
          template_id: invitation.template_id,
          package_id: invitation.package_id,
          title: invitation.title,
          bride_name: invitation.bride_name,
          groom_name: invitation.groom_name,
          wedding_date: invitation.wedding_date,
          ceremony_time: invitation.ceremony_time,
          ceremony_location: invitation.ceremony_location,
          reception_time: invitation.reception_time,
          reception_location: invitation.reception_location,
          love_story: invitation.love_story,
          background_music_url: invitation.background_music_url,
          gallery_photos: invitation.gallery_photos,
          gallery_videos: invitation.gallery_videos,
          live_stream_url: invitation.live_stream_url,
          rsvp_enabled: invitation.rsvp_enabled,
          guest_book_enabled: invitation.guest_book_enabled,
          digital_gift_enabled: invitation.digital_gift_enabled,
          qr_checkin_enabled: invitation.qr_checkin_enabled
        }
      : {
          template_id: 0,
          package_id: 0,
          title: '',
          bride_name: '',
          groom_name: '',
          wedding_date: new Date(),
          ceremony_time: null,
          ceremony_location: null,
          reception_time: null,
          reception_location: null,
          love_story: null,
          background_music_url: null,
          gallery_photos: '[]',
          gallery_videos: '[]',
          live_stream_url: null,
          rsvp_enabled: true,
          guest_book_enabled: true,
          digital_gift_enabled: true,
          qr_checkin_enabled: false
        }
  );
  
  const [weddingDate, setWeddingDate] = useState<Date | undefined>(
    invitation ? invitation.wedding_date : new Date()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingDate) return;

    if (invitation) {
      // For updates, only send the fields that can be updated
      const updateData: UpdateInvitationInput = {
        id: formData.id!,
        title: formData.title,
        bride_name: formData.bride_name,
        groom_name: formData.groom_name,
        wedding_date: weddingDate,
        ceremony_time: formData.ceremony_time,
        ceremony_location: formData.ceremony_location,
        reception_time: formData.reception_time,
        reception_location: formData.reception_location,
        love_story: formData.love_story,
        background_music_url: formData.background_music_url,
        gallery_photos: formData.gallery_photos,
        gallery_videos: formData.gallery_videos,
        live_stream_url: formData.live_stream_url,
        rsvp_enabled: formData.rsvp_enabled,
        guest_book_enabled: formData.guest_book_enabled,
        digital_gift_enabled: formData.digital_gift_enabled,
        qr_checkin_enabled: formData.qr_checkin_enabled
      };
      await onSubmit(updateData);
    } else {
      // For creation, send all required fields
      const createData: CreateInvitationInput = {
        template_id: formData.template_id,
        package_id: formData.package_id,
        title: formData.title,
        bride_name: formData.bride_name,
        groom_name: formData.groom_name,
        wedding_date: weddingDate,
        ceremony_time: formData.ceremony_time,
        ceremony_location: formData.ceremony_location,
        reception_time: formData.reception_time,
        reception_location: formData.reception_location,
        love_story: formData.love_story,
        background_music_url: formData.background_music_url,
        gallery_photos: formData.gallery_photos,
        gallery_videos: formData.gallery_videos,
        live_stream_url: formData.live_stream_url,
        rsvp_enabled: formData.rsvp_enabled,
        guest_book_enabled: formData.guest_book_enabled,
        digital_gift_enabled: formData.digital_gift_enabled,
        qr_checkin_enabled: formData.qr_checkin_enabled
      };
      await onSubmit(createData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const parseFeatures = (featuresJson: string) => {
    try {
      return JSON.parse(featuresJson);
    } catch {
      return [];
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="w-6 h-6 text-rose-500" />
            <span>{invitation ? '✏️ Edit Undangan' : '💌 Buat Undangan Baru'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📝 Informasi Dasar</CardTitle>
              <CardDescription>Masukkan informasi dasar undangan pernikahan Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!invitation && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template">🎨 Pilih Template</Label>
                      <Select
                        value={String(formData.template_id || '')}
                        onValueChange={(value: string) =>
                          setFormData((prev: FormData) => ({ ...prev, template_id: parseInt(value) }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih template undangan" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template: Template) => (
                            <SelectItem key={template.id} value={String(template.id)}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="package">💎 Pilih Paket</Label>
                      <Select
                        value={String(formData.package_id || '')}
                        onValueChange={(value: string) =>
                          setFormData((prev: FormData) => ({ ...prev, package_id: parseInt(value) }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih paket undangan" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((pkg: Package) => (
                            <SelectItem key={pkg.id} value={String(pkg.id)}>
                              <div className="flex justify-between items-center w-full">
                                <span>{pkg.name}</span>
                                <span className="text-green-600 font-semibold ml-2">
                                  {formatCurrency(pkg.price)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.package_id > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      {(() => {
                        const selectedPackage = packages.find((p: Package) => p.id === formData.package_id);
                        if (!selectedPackage) return null;
                        const features = parseFeatures(selectedPackage.features);
                        return (
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-2">📋 Fitur Paket {selectedPackage.name}:</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                              {features.map((feature: string, index: number) => (
                                <li key={index} className="flex items-center space-x-2">
                                  <span>✅</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="text-sm text-blue-600 mt-2">
                              💰 Harga: <span className="font-semibold">{formatCurrency(selectedPackage.price)}</span>
                              {selectedPackage.max_guests && (
                                <span> • 👥 Maks. {selectedPackage.max_guests} tamu</span>
                              )}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {invitation && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Template: <span className="font-semibold">{templates.find(t => t.id === invitation.template_id)?.name || 'Unknown'}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Paket: <span className="font-semibold">{packages.find(p => p.id === invitation.package_id)?.name || 'Unknown'}</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">💌 Judul Undangan</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: FormData) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Contoh: Undangan Pernikahan Kami"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bride_name">👰 Nama Mempelai Wanita</Label>
                  <Input
                    id="bride_name"
                    value={formData.bride_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: FormData) => ({ ...prev, bride_name: e.target.value }))
                    }
                    placeholder="Nama lengkap mempelai wanita"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groom_name">🤵 Nama Mempelai Pria</Label>
                  <Input
                    id="groom_name"
                    value={formData.groom_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: FormData) => ({ ...prev, groom_name: e.target.value }))
                    }
                    placeholder="Nama lengkap mempelai pria"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>📅 Tanggal Pernikahan</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {weddingDate ? format(weddingDate, 'PPP', { locale: id }) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={weddingDate}
                      onSelect={setWeddingDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Ceremony & Reception Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⛪ Detail Acara</CardTitle>
              <CardDescription>Informasi tentang akad nikah dan resepsi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ceremony_time">🕐 Waktu Akad Nikah</Label>
                  <Input
                    id="ceremony_time"
                    type="time"
                    value={formData.ceremony_time || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: FormData) => ({ ...prev, ceremony_time: e.target.value || null }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reception_time">🕐 Waktu Resepsi</Label>
                  <Input
                    id="reception_time"
                    type="time"
                    value={formData.reception_time || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: FormData) => ({ ...prev, reception_time: e.target.value || null }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ceremony_location">📍 Lokasi Akad Nikah</Label>
                <Input
                  id="ceremony_location"
                  value={formData.ceremony_location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: FormData) => ({ ...prev, ceremony_location: e.target.value || null }))
                  }
                  placeholder="Alamat lengkap tempat akad nikah"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reception_location">📍 Lokasi Resepsi</Label>
                <Input
                  id="reception_location"
                  value={formData.reception_location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: FormData) => ({ ...prev, reception_location: e.target.value || null }))
                  }
                  placeholder="Alamat lengkap tempat resepsi"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💝 Konten Tambahan</CardTitle>
              <CardDescription>Personalisasi undangan Anda dengan konten khusus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="love_story">💕 Kisah Cinta (Opsional)</Label>
                <Textarea
                  id="love_story"
                  value={formData.love_story || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: FormData) => ({ ...prev, love_story: e.target.value || null }))
                  }
                  placeholder="Ceritakan kisah cinta Anda untuk dibagikan kepada tamu..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="background_music_url">🎵 URL Musik Latar (Opsional)</Label>
                <Input
                  id="background_music_url"
                  type="url"
                  value={formData.background_music_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: FormData) => ({ ...prev, background_music_url: e.target.value || null }))
                  }
                  placeholder="https://example.com/music.mp3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="live_stream_url">📺 URL Live Streaming (Opsional)</Label>
                <Input
                  id="live_stream_url"
                  type="url"
                  value={formData.live_stream_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: FormData) => ({ ...prev, live_stream_url: e.target.value || null }))
                  }
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Features Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚙️ Pengaturan Fitur</CardTitle>
              <CardDescription>Aktifkan atau nonaktifkan fitur undangan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="rsvp_enabled">📝 RSVP</Label>
                    <p className="text-sm text-gray-500">Konfirmasi kehadiran tamu</p>
                  </div>
                  <Switch
                    id="rsvp_enabled"
                    checked={formData.rsvp_enabled}
                    onCheckedChange={(checked: boolean) =>
                      setFormData((prev: FormData) => ({ ...prev, rsvp_enabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="guest_book_enabled">📖 Buku Tamu</Label>
                    <p className="text-sm text-gray-500">Ucapan dan doa dari tamu</p>
                  </div>
                  <Switch
                    id="guest_book_enabled"
                    checked={formData.guest_book_enabled}
                    onCheckedChange={(checked: boolean) =>
                      setFormData((prev: FormData) => ({ ...prev, guest_book_enabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="digital_gift_enabled">💰 Amplop Digital</Label>
                    <p className="text-sm text-gray-500">Hadiah dalam bentuk uang</p>
                  </div>
                  <Switch
                    id="digital_gift_enabled"
                    checked={formData.digital_gift_enabled}
                    onCheckedChange={(checked: boolean) =>
                      setFormData((prev: FormData) => ({ ...prev, digital_gift_enabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label htmlFor="qr_checkin_enabled">📱 QR Check-in</Label>
                    <p className="text-sm text-gray-500">Absensi tamu dengan QR code</p>
                  </div>
                  <Switch
                    id="qr_checkin_enabled"
                    checked={formData.qr_checkin_enabled}
                    onCheckedChange={(checked: boolean) =>
                      setFormData((prev: FormData) => ({ ...prev, qr_checkin_enabled: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-rose-500 hover:bg-rose-600">
              {isLoading ? 'Menyimpan...' : invitation ? '💾 Simpan Perubahan' : '💌 Buat Undangan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
