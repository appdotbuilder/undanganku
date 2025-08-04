
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Heart, Calendar, MapPin, Users, Wallet, Plus, Eye, Edit, Trash2, CheckCircle } from 'lucide-react';
import type { Invitation, Template, Package, WalletTopup, CreateInvitationInput, UpdateInvitationInput, CreateWalletTopupInput } from '../../server/src/schema';
import { InvitationForm } from './components/InvitationForm';
import { WalletTopupForm } from './components/WalletTopupForm';

function App() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [walletTopups, setWalletTopups] = useState<WalletTopup[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [invitationsData, templatesData, packagesData, walletData, topupsData] = await Promise.all([
        trpc.getInvitations.query(),
        trpc.getTemplates.query(),
        trpc.getPackages.query(),
        trpc.getWalletBalance.query(),
        trpc.getWalletTopups.query()
      ]);
      
      setInvitations(invitationsData);
      setTemplates(templatesData);
      setPackages(packagesData);
      setWalletBalance(walletData);
      setWalletTopups(topupsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateInvitation = async (data: CreateInvitationInput) => {
    setIsLoading(true);
    try {
      const newInvitation = await trpc.createInvitation.mutate(data);
      setInvitations((prev: Invitation[]) => [...prev, newInvitation]);
      setShowInvitationForm(false);
    } catch (error) {
      console.error('Failed to create invitation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInvitation = async (data: UpdateInvitationInput) => {
    setIsLoading(true);
    try {
      const updatedInvitation = await trpc.updateInvitation.mutate(data);
      setInvitations((prev: Invitation[]) =>
        prev.map((inv: Invitation) => inv.id === updatedInvitation.id ? updatedInvitation : inv)
      );
      setEditingInvitation(null);
    } catch (error) {
      console.error('Failed to update invitation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationSubmit = async (data: CreateInvitationInput | UpdateInvitationInput) => {
    if ('id' in data) {
      await handleUpdateInvitation(data);
    } else {
      await handleCreateInvitation(data);
    }
  };

  const handlePublishInvitation = async (invitationId: number) => {
    setIsLoading(true);
    try {
      const publishedInvitation = await trpc.publishInvitation.mutate(invitationId);
      setInvitations((prev: Invitation[]) =>
        prev.map((inv: Invitation) => inv.id === invitationId ? publishedInvitation : inv)
      );
      // Refresh wallet balance
      const newBalance = await trpc.getWalletBalance.query();
      setWalletBalance(newBalance);
    } catch (error) {
      console.error('Failed to publish invitation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus undangan ini?')) return;
    
    setIsLoading(true);
    try {
      await trpc.deleteInvitation.mutate(invitationId);
      setInvitations((prev: Invitation[]) => prev.filter((inv: Invitation) => inv.id !== invitationId));
    } catch (error) {
      console.error('Failed to delete invitation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletTopup = async (data: CreateWalletTopupInput) => {
    setIsLoading(true);
    try {
      await trpc.createWalletTopup.mutate(data);
      const updatedTopups = await trpc.getWalletTopups.query();
      setWalletTopups(updatedTopups);
      setShowWalletForm(false);
    } catch (error) {
      console.error('Failed to create wallet topup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPackageName = (packageId: number) => {
    const pkg = packages.find((p: Package) => p.id === packageId);
    return pkg?.name || 'Unknown Package';
  };

  const getTemplateName = (templateId: number) => {
    const template = templates.find((t: Template) => t.id === templateId);
    return template?.name || 'Unknown Template';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-rose-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Heart className="w-8 h-8 text-rose-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">💐 Wedding Invitation CMS</h1>
                <p className="text-sm text-gray-600">Sistem Manajemen Undangan Pernikahan Digital</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-rose-100 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-rose-800">
                  💰 Saldo: {formatCurrency(walletBalance)}
                </span>
              </div>
              <Button onClick={() => setShowWalletForm(true)} variant="outline" className="border-rose-200">
                <Wallet className="w-4 h-4 mr-2" />
                Top Up Saldo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-rose-200">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-rose-100">
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-rose-100">
              💌 Undangan Saya
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-rose-100">
              🎨 Template
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-rose-100">
              💳 E-Wallet
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-rose-100 to-pink-100 border-rose-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-rose-800">Total Undangan</p>
                      <p className="text-3xl font-bold text-rose-900">{invitations.length}</p>
                    </div>
                    <Heart className="w-8 h-8 text-rose-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-100 to-emerald-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Dipublikasi</p>
                      <p className="text-3xl font-bold text-green-900">
                        {invitations.filter((inv: Invitation) => inv.is_published).length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Template Tersedia</p>
                      <p className="text-3xl font-bold text-blue-900">{templates.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Saldo E-Wallet</p>
                      <p className="text-xl font-bold text-yellow-900">{formatCurrency(walletBalance)}</p>
                    </div>
                    <Wallet className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-rose-500" />
                  <span>Aktivitas Terbaru</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Belum ada undangan yang dibuat</p>
                    <Button onClick={() => setShowInvitationForm(true)} className="bg-rose-500 hover:bg-rose-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Undangan Pertama
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invitations.slice(0, 5).map((invitation: Invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Heart className="w-8 h-8 text-rose-400" />
                          <div>
                            <p className="font-semibold text-gray-900">{invitation.title}</p>
                            <p className="text-sm text-gray-600">
                              {invitation.bride_name} & {invitation.groom_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Dibuat: {invitation.created_at.toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={invitation.is_published ? 'default' : 'secondary'}>
                          {invitation.is_published ? '✅ Dipublikasi' : '📝 Draft'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">💌 Undangan Pernikahan Saya</h2>
              <Button onClick={() => setShowInvitationForm(true)} className="bg-rose-500 hover:bg-rose-600">
                <Plus className="w-4 h-4 mr-2" />
                Buat Undangan Baru
              </Button>
            </div>

            {invitations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Heart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Undangan</h3>
                  <p className="text-gray-500 mb-6">
                    Mulai buat undangan pernikahan digital pertama Anda dengan template yang tersedia
                  </p>
                  <Button onClick={() => setShowInvitationForm(true)} className="bg-rose-500 hover:bg-rose-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Undangan Sekarang
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map((invitation: Invitation) => (
                  <Card key={invitation.id} className="hover:shadow-lg transition-shadow border-rose-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-gray-900">{invitation.title}</CardTitle>
                        <Badge variant={invitation.is_published ? 'default' : 'secondary'}>
                          {invitation.is_published ? '✅ Published' : '📝 Draft'}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-rose-400" />
                        <span>{invitation.bride_name} & {invitation.groom_name}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{invitation.wedding_date.toLocaleDateString('id-ID')}</span>
                        </div>
                        {invitation.ceremony_location && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{invitation.ceremony_location}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Template: {getTemplateName(invitation.template_id)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Paket: {getPackageName(invitation.package_id)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingInvitation(invitation)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {invitation.is_published && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-green-200 text-green-600 hover:bg-green-50"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Lihat
                            </Button>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {!invitation.is_published && (
                            <Button 
                              size="sm"
                              onClick={() => handlePublishInvitation(invitation.id)}
                              disabled={isLoading}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Publikasi
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            disabled={isLoading}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">🎨 Template Undangan</h2>
            
            {templates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Template Segera Hadir</h3>
                  <p className="text-gray-500">
                    Admin sedang menyiapkan berbagai template undangan yang indah untuk Anda
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template: Template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {template.preview_image ? (
                        <img 
                          src={template.preview_image} 
                          alt={template.name}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-rose-100 to-pink-100 rounded-lg mb-4 flex items-center justify-center">
                          <Heart className="w-16 h-16 text-rose-300" />
                        </div>
                      )}
                      <Button 
                        className="w-full bg-rose-500 hover:bg-rose-600"
                        onClick={() => setShowInvitationForm(true)}
                      >
                        Gunakan Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">💳 E-Wallet Saya</h2>
              <Button onClick={() => setShowWalletForm(true)} className="bg-green-500 hover:bg-green-600">
                <Plus className="w-4 h-4 mr-2" />
                Top Up Saldo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-green-100 to-emerald-100 border-green-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Wallet className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-green-800 mb-2">Saldo Saat Ini</p>
                    <p className="text-3xl font-bold text-green-900">{formatCurrency(walletBalance)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-blue-800 mb-2">Total Top Up</p>
                    <p className="text-3xl font-bold text-blue-900">{walletTopups.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                    <p className="text-sm font-medium text-yellow-800 mb-2">Menunggu Approval</p>
                    <p className="text-3xl font-bold text-yellow-900">
                      {walletTopups.filter((topup: WalletTopup) => topup.status === 'pending').length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Wallet History */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Riwayat Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                {walletTopups.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Belum ada transaksi top up</p>
                    <Button onClick={() => setShowWalletForm(true)} className="bg-green-500 hover:bg-green-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Top Up Sekarang
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {walletTopups.map((topup: WalletTopup) => (
                      <div key={topup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{formatCurrency(topup.amount)}</p>
                          <p className="text-sm text-gray-600">
                            {topup.payment_method} • {topup.created_at.toLocaleDateString('id-ID')}
                          </p>
                          {topup.admin_notes && (
                            <p className="text-xs text-gray-500 mt-1">Catatan: {topup.admin_notes}</p>
                          )}
                        </div>
                        <Badge 
                          variant={
                            topup.status === 'approved' ? 'default' : 
                            topup.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {topup.status === 'approved' ? '✅ Disetujui' : 
                           topup.status === 'rejected' ? '❌ Ditolak' : '⏳ Menunggu'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {(showInvitationForm || editingInvitation) && (
        <InvitationForm
          invitation={editingInvitation}
          templates={templates}
          packages={packages}
          onSubmit={handleInvitationSubmit}
          onClose={() => {
            setShowInvitationForm(false);
            setEditingInvitation(null);
          }}
          isLoading={isLoading}
        />
      )}

      {showWalletForm && (
        <WalletTopupForm
          onSubmit={handleWalletTopup}
          onClose={() => setShowWalletForm(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default App;
