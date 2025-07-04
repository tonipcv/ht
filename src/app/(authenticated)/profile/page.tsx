'use client';

import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { ArrowRightOnRectangleIcon, CameraIcon, LinkIcon, UserIcon, UserGroupIcon, ClipboardDocumentIcon, SparklesIcon, ShoppingCartIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUserPlan } from "@/hooks/use-user-plan";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isPremium, isLoading: isPlanLoading, planExpiresAt, daysRemaining } = useUserPlan();

  // Estados para os dados do perfil
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [slug, setSlug] = useState('');
  const [pageTemplate, setPageTemplate] = useState('default');
  const [leadCount, setLeadCount] = useState(0);
  const [indicationCount, setIndicationCount] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');
  
  // Estados de UI
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileFetched, setProfileFetched] = useState(false);
  
  // Estado para garantir renderização no cliente
  const [isClient, setIsClient] = useState(false);

  // Efeito para marcar que estamos no cliente
  useEffect(() => {
    setIsClient(true);
    // Use environment variable instead of window.location.origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://med1.app';
    setBaseUrl(appUrl);
  }, []);

  // Efeito para carregar os dados do perfil quando a sessão estiver pronta
  useEffect(() => {
    if (status === 'loading' || !isClient) return;
    
    if (status === 'authenticated' && session?.user?.id && !profileFetched) {
      fetchUserProfile();
    } else if (status === 'unauthenticated') {
      // Redirecionar para login se não estiver autenticado
      router.push('/auth/signin');
    }
  }, [status, session, isClient, profileFetched]);

  const fetchUserProfile = async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    
    try {
      // Usar AbortController para poder cancelar a requisição se necessário
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`/api/users/profile?userId=${session.user.id}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        // Atualizar os estados apenas quando os dados forem recebidos
        setName(data.name || '');
        setEmail(data.email || '');
        setImage(data.image || '');
        setSpecialty(data.specialty || '');
        setSlug(data.slug || '');
        setPageTemplate(data.pageTemplate || 'default');
        setLeadCount(data._count?.leads || 0);
        setIndicationCount(data._count?.indications || 0);
        setProfileFetched(true);
      } else {
        console.error('Erro ao buscar perfil:', response.statusText);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao buscar perfil do usuário:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Falha ao fazer upload da imagem');

      const data = await response.json();
      setImage(data.url);
      
      // Update session and save to database
      await handleSave(data.url);
      
      // Force refresh to update navigation
      router.refresh();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer o upload da imagem",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (newImage?: string) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          image: newImage || image,
          specialty,
          pageTemplate
        }),
      });

      if (!response.ok) throw new Error('Falha ao atualizar perfil');

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso",
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive"
      });
    }
  };

  const copyProfileLinkToClipboard = () => {
    if (isClient && typeof navigator !== 'undefined' && navigator.clipboard) {
      const profileUrl = `${baseUrl}/${slug}`;
      navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copiado",
        description: "Seu link de perfil foi copiado para a área de transferência",
      });
    }
  };

  // Mostrar um spinner enquanto carrega
  if (!isClient || status === 'loading' || (isLoading && !profileFetched)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pt-6 pb-8 lg:ml-52">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 sm:mb-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-[-0.03em] font-inter">Seu Perfil</h1>
            <p className="text-xs md:text-sm text-zinc-400 tracking-[-0.03em] font-inter">Gerencie seus dados e configurações</p>
          </div>
          {!isEditing && (
            <div className="flex gap-2 mt-2 md:mt-0">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 transition-all duration-300 rounded-2xl h-8 text-xs"
                onClick={() => setIsEditing(true)}
              >
                Editar Perfil
              </Button>
              <Link href="/settings/interest-options">
                <Button 
                  variant="outline"
                  size="sm"
                  className="bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 transition-all duration-300 rounded-2xl h-8 text-xs"
                >
                  Configurações
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Visão geral do perfil */}
        <Card className="bg-zinc-900/50 border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.16)] transition-all duration-300 rounded-2xl mb-4">
          <CardHeader className="px-4 py-3 sm:p-3">
            <CardTitle className="text-sm md:text-base font-bold text-white tracking-[-0.03em] font-inter">
              Informações Pessoais
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 tracking-[-0.03em] font-inter">
              Dados da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-3 sm:p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Foto de perfil */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative group">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800">
                    {image ? (
                      <Image
                        src={image}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <CameraIcon className="h-10 w-10 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <label 
                    className="absolute inset-0 flex items-center justify-center bg-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                    htmlFor="image-upload"
                  >
                    <CameraIcon className="h-6 w-6 text-zinc-300" />
                  </label>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50 rounded-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-300"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  Clique na imagem para alterar sua foto
                </p>
              </div>

              {/* Dados do perfil */}
              <div className="md:col-span-2 space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-300 font-medium">Nome</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-300 font-medium">Especialidade</Label>
                      <Input
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 h-8 text-xs"
                        placeholder="Ex: Cardiologista, Nutricionista..."
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-300 font-medium">Email</Label>
                      <p className="text-xs text-zinc-300">{email}</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-zinc-300 font-medium">Template da Página</Label>
                      <Select value={pageTemplate} onValueChange={setPageTemplate}>
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-600 focus:border-zinc-600 h-8 text-xs">
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                          <SelectItem value="default" className="focus:bg-zinc-800 text-xs">Padrão</SelectItem>
                          <SelectItem value="minimal" className="focus:bg-zinc-800 text-xs">Minimalista</SelectItem>
                          <SelectItem value="pro" className="focus:bg-zinc-800 text-xs">Profissional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="pt-2 flex gap-2">
                      <Button 
                        type="button" 
                        onClick={() => handleSave()}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white shadow-md rounded-xl h-8 text-xs"
                      >
                        Salvar Alterações
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        className="border-zinc-700 bg-zinc-800/50 text-zinc-300 rounded-xl shadow-sm h-8 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-[-0.03em] font-inter">{name}</h2>
                      {specialty && (
                        <div className="flex items-center mt-1">
                          <UserIcon className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                          <span className="text-zinc-300 text-xs">{specialty}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center text-zinc-300">
                        <UserIcon className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                        <span className="text-xs">Username: <span className="font-medium">{slug}</span></span>
                      </div>
                      
                      <div className="flex items-center text-zinc-300">
                        <LinkIcon className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
                        <span className="text-xs">Seu link: <span className="text-white">{baseUrl}/{slug}</span></span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-1 h-5 w-5 p-0 hover:bg-zinc-800 text-zinc-400 rounded-lg"
                          onClick={copyProfileLinkToClipboard}
                        >
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-3 mt-1.5">
                        <div className="text-xs bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded-md flex items-center border border-zinc-700">
                          <UserGroupIcon className="h-3.5 w-3.5 inline mr-1" />
                          {leadCount} leads
                        </div>
                        <div className="text-xs bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded-md flex items-center border border-zinc-700">
                          <LinkIcon className="h-3.5 w-3.5 inline mr-1" />
                          {indicationCount} indicações
                        </div>
                        {isPremium && (
                          <div className="text-xs bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded-md flex items-center border border-zinc-700">
                            <SparklesIcon className="h-3.5 w-3.5 inline mr-1" />
                            Premium
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas do usuário */}
        <Card className="bg-zinc-900/50 border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.16)] transition-all duration-300 rounded-2xl mb-4">
          <CardHeader className="px-4 py-3 sm:p-3">
            <CardTitle className="text-sm md:text-base font-bold text-white tracking-[-0.03em] font-inter">
              Métricas e Estatísticas
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 tracking-[-0.03em] font-inter">
              Desempenho da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-3 sm:p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-zinc-800/50 border-zinc-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <UserGroupIcon className="h-4 w-4 text-zinc-400" />
                    <p className="text-xs text-zinc-300">Leads Totais</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">{leadCount}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-zinc-800/50 border-zinc-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <LinkIcon className="h-4 w-4 text-zinc-400" />
                    <p className="text-xs text-zinc-300">Links de Indicação</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">{indicationCount}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-zinc-800/50 border-zinc-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <SwatchIcon className="h-4 w-4 text-zinc-400" />
                    <p className="text-xs text-zinc-300">Taxa de Conversão</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">
                    {indicationCount && leadCount
                      ? `${Math.round((leadCount / indicationCount) * 100)}%`
                      : "0%"}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-zinc-800/50 border-zinc-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-2xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCartIcon className="h-4 w-4 text-zinc-400" />
                    <p className="text-xs text-zinc-300">Status da Conta</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white">
                    {isPremium ? "Premium" : "Free"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Logout */}
        <div className="pt-1">
          <Button 
            variant="outline" 
            className="w-full bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 transition-all duration-300 rounded-2xl h-8 text-xs"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          >
            <ArrowRightOnRectangleIcon className="h-3.5 w-3.5 mr-1.5" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
} 