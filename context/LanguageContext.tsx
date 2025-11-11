import React, { createContext, useContext } from 'react';

// The content of locales/pt.json is embedded here to fix module loading issues.
const messages = {
  "common": {
    "online": "Online",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "deleting": "Excluindo...",
    "you": "Você",
    "user": "Usuário"
  },
  "login": {
    "title": "💎 VibeMP",
    "emailLabel": "Endereço de e-mail",
    "passwordLabel": "Senha",
    "loginButton": "Entrar",
    "loggingInButton": "Entrando...",
    "forgotPassword": "Esqueceu a senha?",
    "noAccount": "Não tem uma conta?",
    "signUpLink": "Cadastre-se",
    "getTheApp": "Obtenha o aplicativo.",
    "error": "Falha ao entrar. Verifique seu e-mail e senha.",
    "appStoreAlt": "Baixar na App Store",
    "googlePlayAlt": "Disponível no Google Play"
  },
  "signup": {
    "title": "💎 VibeMP",
    "subtitle": "Cadastre-se para ver fotos e vídeos dos seus amigos.",
    "emailLabel": "Endereço de e-mail",
    "usernameLabel": "Nome de usuário",
    "passwordLabel": "Senha",
    "signUpButton": "Cadastre-se",
    "signingUpButton": "Cadastrando...",
    "haveAccount": "Tem uma conta?",
    "logInLink": "Entrar",
    "getTheApp": "Obtenha o aplicativo.",
    "emailInUseError": "Este e-mail já está em uso.",
    "genericError": "Falha ao criar uma conta. Por favor, tente novamente."
  },
  "header": {
    "title": "💎 VibeMP",
    "searchPlaceholder": "Pesquisar",
    "noResults": "Nenhum resultado encontrado.",
    "following": "Seguindo",
    "follow": "Seguir",
    "requested": "Solicitado",
    "notifications": "Notificações",
    "noActivity": "Nenhuma atividade nova.",
    "profile": "Perfil",
    "createPost": "Criar Publicação",
    "logOut": "Sair",
    "cancel": "Cancelar",
    "messages": "Direct",
    "followNotification": "{username} começou a seguir você.",
    "messageNotification": "{username} te enviou uma mensagem.",
    "followRequestNotification": "{username} quer seguir você.",
    "mentionCommentNotification": "{username} mencionou você em um comentário: \"{commentText}\"",
    "duoRequestNotification": "<b>{username}</b> quer criar uma foto em dupla com você.",
    "duoAcceptedNotification": "<b>{username}</b> aceitou sua solicitação de foto em dupla.",
    "duoRefusedNotification": "<b>{username}</b> recusou sua solicitação de foto em dupla.",
    "accept": "Aceitar",
    "decline": "Recusar"
  },
  "feed": {
    "welcome": "Bem-vindo ao VibeMP",
    "empty": "Parece que seu feed está vazio.",
    "emptySuggestion": "Use a barra de pesquisa para encontrar e seguir seus amigos para ver as fotos e vídeos deles."
  },
  "post": {
    "like": "Curtir",
    "comment": "Comentar",
    "forward": "Encaminhar",
    "duoPhoto": "Foto em Dupla",
    "and": "e",
    "moreOptions": "Mais opções",
    "delete": "Excluir",
    "likes": "curtidas",
    "viewAllComments": "Ver todos os {count} comentários",
    "addComment": "Adicione um comentário...",
    "postButton": "Publicar",
    "mentionSearching": "Procurando...",
    "mentionNoUsers": "Nenhum usuário encontrado.",
    "deleteCommentTitle": "Excluir Comentário?",
    "deleteCommentBody": "Tem certeza que deseja excluir este comentário?",
    "deletePostTitle": "Excluir Publicação?",
    "deletePostBody": "Tem certeza que deseja excluir esta publicação?",
    "deleting": "Excluindo...",
    "viewSingular": "visualização",
    "viewPlural": "visualizações",
    "viewedBy": "Visto por",
    "noViews": "Nenhuma visualização ainda."
  },
  "time": {
    "seconds": "há {count}s",
    "minutes": "há {count}m",
    "hours": "há {count}h",
    "days": "há {count}d"
  },
  "profile": {
    "editProfile": "Editar Perfil",
    "following": "Seguindo",
    "follow": "Seguir",
    "message": "Mensagem",
    "posts": "publicações",
    "followers": "seguidores",
    "followingCount": "seguindo",
    "postsTab": "PUBLICAÇÕES",
    "pulsesTab": "PULSOS",
    "noPosts": "Nenhuma Publicação Ainda",
    "noPostsSuggestion": "Quando este usuário compartilhar fotos, você as verá aqui.",
    "noPulses": "Nenhum Pulso Ainda",
    "noPulsesSuggestion": "Este usuário não compartilhou nenhum pulso.",
    "privateAccountMessage": "Esta Conta é Privada",
    "privateAccountSuggestion": "Siga para ver as fotos e vídeos.",
    "notFound": "Usuário não encontrado."
  },
  "editProfile": {
    "title": "Editar Perfil",
    "changePhoto": "Alterar foto do perfil",
    "usernameLabel": "Nome de usuário",
    "bioLabel": "Biografia",
    "privateAccount": "Conta Privada",
    "privateAccountInfo": "Apenas seus seguidores poderão ver suas fotos e vídeos.",
    "submit": "Enviar",
    "submitting": "Enviando...",
    "updateError": "Falha ao atualizar o perfil. Por favor, tente novamente."
  },
  "createPost": {
    "title": "Criar nova publicação",
    "share": "Compartilhar",
    "sharing": "Compartilhando...",
    "captionLabel": "Escreva uma legenda...",
    "dragPhotos": "Arraste as fotos aqui",
    "selectFromComputer": "Selecionar do computador",
    "ventMode": "Modo Desabafo",
    "ventModeInfo": "Apenas seguidores selecionados verão esta publicação.",
    "searchFollowers": "Pesquisar seguidores...",
    "noFollowersFound": "Nenhum seguidor encontrado.",
    "selectAll": "Selecionar Todos",
    "deselectAll": "Desmarcar Todos",
    "selectedCount": "{count} selecionados",
    "addMusic": "Adicionar música",
    "changeMusic": "Alterar Música",
    "searchMusicPlaceholder": "Procure por uma música ou artista...",
    "search": "Buscar",
    "searching": "Buscando...",
    "musicNoResults": "Nenhuma música encontrada.",
    "selectMusic": "Selecionar música"
  },
  "messages": {
    "title": "Mensagens",
    "newMessage": "Nova mensagem",
    "close": "Fechar mensagens",
    "loading": "Carregando conversas...",
    "noConversations": "Nenhuma conversa ainda.",
    "back": "Voltar para as conversas",
    "yourMessages": "Suas Mensagens",
    "sendPrivate": "Envie fotos e mensagens privadas para um amigo.",
    "seen": "Visto",
    "recording": "Gravando...",
    "replyingToSelf": "Respondendo a si mesmo",
    "replyingToOther": "Respondendo a {username}",
    "messagePlaceholder": "Mensagem...",
    "send": "Enviar",
    "deleteTitle": "Excluir Mensagem?",
    "deleteBody": "Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.",
    "newMessageTitle": "Nova Mensagem",
    "searchUsers": "Procurar usuários...",
    "media": {
      "photo": "Foto",
      "video": "Vídeo",
      "audio": "Mensagem de voz",
      "select": "Anexar mídia",
      "uploadError": "Falha ao enviar mídia.",
      "videoTooLong": "O vídeo não pode ter mais de 30 segundos.",
      "cancelUpload": "Cancelar envio",
      "viewMedia": "Ver mídia"
    },
    "forwardedPost": "Encaminhou uma publicação",
    "anonymousModeOn": "Ficar anônimo",
    "anonymousModeOff": "Ficar online"
  },
  "forwardModal": {
    "title": "Encaminhar para",
    "search": "Pesquisar...",
    "noFollowing": "Você não segue ninguém.",
    "noResults": "Nenhum usuário encontrado.",
    "send": "Enviar",
    "sending": "Enviando...",
    "sent": "Enviado"
  },
  "duoModal": {
    "title": "Criar Foto em Dupla",
    "description": "Selecione um amigo para compartilhar esta publicação. Ele receberá uma solicitação para aceitar.",
    "sendRequest": "Enviar Solicitação",
    "sending": "Enviando...",
    "noFollowing": "Você não segue ninguém para convidar.",
    "requestSent": "Solicitação enviada!",
    "alreadyPartnered": "Esta publicação já tem uma dupla.",
    "requestPending": "Já existe uma solicitação pendente para esta publicação."
  },
  "crystal": {
    "formed": "💎 Um novo Cristal de Conexão foi formado!",
    "glowing": "💎 Sua conexão está brilhando!",
    "level": {
      "brilhante": "Brilhante",
      "equilibrado": "Equilibrado",
      "apagado": "Apagado",
      "rachado": "Rachado"
    },
    "title": "Cristal de Conexão: {status}",
    "streak": "{streak} dias de interação seguida"
  },
  "createPulse": {
    "title": "Criar novo pulso",
    "publishing": "Publicando...",
    "publish": "Publicar Pulso",
    "captionLabel": "Escreva uma legenda... (opcional)",
    "selectMedia": "Selecione uma imagem ou vídeo",
    "selectFromComputer": "Selecionar do computador",
    "invalidFileError": "Por favor, selecione um arquivo de imagem ou vídeo válido.",
    "publishError": "Falha ao criar o pulso. Por favor, tente novamente.",
    "ventMode": "Modo Desabafo",
    "ventModeInfo": "Apenas seguidores selecionados verão este pulso."
  },
  "pulseViewer": {
    "previous": "Pulso anterior",
    "next": "Próximo pulso",
    "delete": "Excluir Pulso",
    "deleteTitle": "Excluir Pulso?",
    "deleteBody": "Tem certeza que deseja excluir este pulso? Esta ação não pode ser desfeita.",
    "viewedBy": "Visto por",
    "noViews": "Nenhuma visualização ainda.",
    "viewSingular": "visualização",
    "viewPlural": "visualizações"
  },
  "pulseBar": {
    "viewPulse": "Ver o pulso de {username}"
  },
  "welcome": {
    "title": "Bem vindo ao VibeMP"
  },
  "footer": {
    "language": "Português (Brasil)",
    "copyright": "© {year} VibeMP da Meta",
    "links": {
      "meta": "Meta",
      "about": "Sobre",
      "blog": "Blog",
      "jobs": "Carreiras",
      "help": "Ajuda",
      "api": "API",
      "privacy": "Privacidade",
      "terms": "Termos",
      "locations": "Localizações",
      "lite": "Instagram Lite",
      "threads": "Threads",
      "contact": "Carregamento de contatos e não usuários",
      "verified": "Meta Verified"
    }
  }
};


// Set 'pt-BR' as the language.
type Language = 'pt-BR';

interface LanguageContextType {
  language: Language;
  // Keep setLanguage as a no-op function for components that might still call it, to avoid crashes.
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hardcode the language to Brazilian Portuguese.
  const language: Language = 'pt-BR';

  // This function does nothing, as the language is fixed.
  const setLanguage = (lang: Language) => {};

  const t = (key: string, replacements?: { [key:string]: string | number }): string => {
    let message = key.split('.').reduce((o, i) => (o ? o[i] : undefined), messages as Record<string, any>) || key;
    if (replacements && typeof message === 'string') {
      Object.keys(replacements).forEach(placeholder => {
        message = message.replace(`{${placeholder}}`, String(replacements[placeholder]));
      });
    }
    return message;
  };

  return (
    // Loading state is no longer needed as the import is synchronous.
    <LanguageContext.Provider value={{ language, setLanguage, t, loading: false }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};