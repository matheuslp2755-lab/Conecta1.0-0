import React, { createContext, useContext, useState } from 'react';

// Embedding JSON content to avoid module resolution issues
const ptMessages = {
  "common": {
    "online": "Online",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "deleting": "Excluindo...",
    "you": "Você",
    "user": "Usuário"
  },
  "login": {
    "title": "Vibe",
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
    "title": "Vibe",
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
    "title": "Vibe",
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
    "welcome": "Bem-vindo ao Vibe",
    "empty": "Parece que seu feed está vazio.",
    "emptySuggestion": "Use a barra de pesquisa para encontrar e seguir seus amigos para ver as fotos e vídeos deles."
  },
  "post": {
    "like": "Curtir",
    "comment": "Comentar",
    "share": "Compartilhar Publicação",
    "forward": "Encaminhar",
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
    "noViews": "Nenhuma visualização ainda.",
    "duoPhoto": "Foto em Dupla",
    "and": "e",
    "addCaption": "Adicionar Legenda",
    "addMusic": "Adicionar Música",
    "addToMemory": "Adicionar à Lembrança"
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
    "notFound": "Usuário não encontrado.",
    "followersModalTitle": "Seguidores",
    "followingModalTitle": "Seguindo",
    "noFollowers": "Nenhum seguidor ainda.",
    "notFollowingAnyone": "Não segue ninguém."
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
    "updateError": "Falha ao atualizar o perfil. Por favor, tente novamente.",
    "profileMusic": "Música do Perfil",
    "noProfileMusic": "Nenhuma música selecionada.",
    "changeMusic": "Alterar música",
    "removeMusic": "Remover"
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
    "anonymousModeOff": "Ficar online",
    "deleteConversationTitle": "Excluir Conversa?",
    "deleteConversationBody": "Isso excluirá permanentemente a conversa para todos e não poderá ser desfeito.",
    "deleteConversationConfirm": "Excluir",
    "recordingError": "Não foi possível iniciar a gravação. Verifique as permissões do microfone.",
    "diariesTitle": "Notas",
    "addNote": "Sua Nota",
    "replyToNote": "Responder à nota de {username}...",
    "notePlaceholder": "Sua nota...",
    "viewNote": "Ver nota"
  },
  "diary": {
    "title": "Diário",
    "publish": "Publicar",
    "publishing": "Publicando...",
    "placeholder": "No que você está pensando hoje?",
    "empty": "O diário está vazio.",
    "emptySuggestion": "Siga pessoas para ver as entradas do diário delas aqui ou escreva a sua!",
    "alreadyPosted": "Você já publicou no diário hoje. Volte amanhã!"
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
    "requestPending": "Já existe uma solicitação pendente para esta publicação.",
    "requestError": "Falha ao enviar solicitação."
  },
  "crystal": {
    "formed": "Um novo Cristal de Conexão foi formado!",
    "glowing": "Sua conexão está brilhando!",
    "level": {
      "brilhante": "Brilhante",
      "equilibrado": "Equilibrado",
      "apagado": "Apagado",
      "rachado": "Rachado"
    },
    "title": "Cristal de Conexão: {status}",
    "streak": "{streak} dias de interação seguida",
    "shareTitle": "Sequência Conecta",
    "shareAction": "Compartilhar no Pulse",
    "publishing": "Publicando...",
    "shareError": "Falha ao publicar o Pulse.",
    "canvasError": "Falha ao gerar a imagem.",
    "imageLoadError": "Falha ao carregar as fotos de perfil.",
    "streakDays": "{streak} dias de conexão",
    "vibe": "— a vibe continua 💬🔥 —",
    "watermark": "Vibe"
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
    "title": "Bem vindo ao Vibe"
  },
  "footer": {
    "language": "Português (Brasil)",
    "copyright": "© {year} Vibe",
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
  },
  "call": {
    "call": "Ligar",
    "calling": "Ligando para {username}...",
    "incomingCall": "Chamada de {username}",
    "answer": "Atender",
    "decline": "Recusar",
    "hangUp": "Desligar",
    "callEnded": "Chamada encerrada",
    "callDeclined": "{username} recusou a chamada.",
    "callCancelled": "Chamada cancelada.",
    "onCallWith": "Em chamada com {username}",
    "enterCallId": "Digite o ID da chamada para entrar",
    "join": "Entrar",
    "callId": "ID da Chamada",
    "copyCallId": "Copiar ID",
    "copied": "Copiado!",
    "callInProgress": "Chamada em progresso...",
    "noMicrophone": "Acesso ao microfone negado. Por favor, habilite nas configurações do seu navegador.",
    "callError": "Ocorreu um erro durante a chamada.",
    "videoCall": "Chamada de Vídeo",
    "voiceCall": "Chamada de Voz"
  },
  "resetPassword": {
    "title": "Redefinir Senha",
    "instructions": "Insira seu e-mail e enviaremos um link para você voltar a acessar sua conta.",
    "emailLabel": "Endereço de e-mail",
    "sendLinkButton": "Enviar Link de Redefinição",
    "sendingLinkButton": "Enviando...",
    "backToLogin": "Voltar para o Login",
    "successMessage": "Verifique seu e-mail para encontrar um link para redefinir sua senha.",
    "errorNotFound": "E-mail não encontrado. Verifique e tente novamente.",
    "genericError": "Falha ao enviar o link de redefinição. Por favor, tente novamente mais tarde."
  },
  "addCaptionModal": {
    "title": "Adicionar Legenda",
    "captionLabel": "Escreva uma legenda...",
    "save": "Salvar",
    "saving": "Salvando...",
    "error": "Falha ao salvar a legenda. Por favor, tente novamente."
  },
  "addMusicModal": {
    "title": "Adicionar Música"
  },
  "musicSearch": {
    "fetchError": "Falha ao buscar músicas",
    "searchError": "Ocorreu um erro durante a busca.",
    "trimInstructions": "Arraste para selecionar o trecho de 15 segundos.",
    "done": "Concluir"
  },
  "musicPlayer": {
    "play": "Tocar",
    "pause": "Pausar"
  },
   "memories": {
    "new": "Nova",
    "add": "Adicionar",
    "title": "Lembranças",
    "edit": "Editar Lembrança",
    "delete": "Excluir Lembrança",
    "deleteConfirm": "Tem certeza que deseja excluir esta lembrança? Esta ação não pode ser desfeita.",
    "selectContent": "Selecionar Conteúdo",
    "next": "Avançar",
    "name": "Nome",
    "editCover": "Editar capa",
    "create": "Criar",
    "save": "Salvar",
    "selectItems": "Selecione os posts e pulses que você quer adicionar.",
    "noContent": "Você não tem posts ou pulses para adicionar.",
    "memoryName": "Nome da Lembrança",
    "selectCover": "Selecione uma capa",
    "creating": "Criando...",
    "saving": "Salvando...",
    "error": "Ocorreu um erro. Tente novamente.",
    "addToMemoryTitle": "Adicionar à Lembrança",
    "createNew": "Criar nova Lembrança",
    "added": "Adicionado!"
  },
  "gallery": {
    "title": "Nova Publicação",
    "selectPhotos": "Selecionar da Galeria",
    "next": "Avançar",
    "galleryTab": "Galeria",
    "cameraTab": "Câmera",
    "capture": "Capturar",
    "cameraError": "Não foi possível acessar a câmera. Verifique as permissões."
  },
  "choiceModal": {
    "title": "O que você quer criar?",
    "post": "Publicação",
    "pulse": "Pulse"
  }
};

const enMessages = {
  "common": {
    "online": "Online",
    "cancel": "Cancel",
    "delete": "Delete",
    "deleting": "Deleting...",
    "you": "You",
    "user": "User"
  },
  "login": {
    "title": "Vibe",
    "emailLabel": "Email address",
    "passwordLabel": "Password",
    "loginButton": "Log In",
    "loggingInButton": "Logging In...",
    "forgotPassword": "Forgot password?",
    "noAccount": "Don't have an account?",
    "signUpLink": "Sign up",
    "getTheApp": "Get the app.",
    "error": "Failed to log in. Please check your email and password.",
    "appStoreAlt": "Download on the App Store",
    "googlePlayAlt": "Get it on Google Play"
  },
  "signup": {
    "title": "Vibe",
    "subtitle": "Sign up to see photos and videos from your friends.",
    "emailLabel": "Email address",
    "usernameLabel": "Username",
    "passwordLabel": "Password",
    "signUpButton": "Sign Up",
    "signingUpButton": "Signing Up...",
    "haveAccount": "Have an account?",
    "logInLink": "Log in",
    "getTheApp": "Get the app.",
    "emailInUseError": "This email is already in use.",
    "genericError": "Failed to create an account. Please try again."
  },
  "header": {
    "title": "Vibe",
    "searchPlaceholder": "Search",
    "noResults": "No results found.",
    "following": "Following",
    "follow": "Follow",
    "requested": "Requested",
    "notifications": "Notifications",
    "noActivity": "No new activity.",
    "profile": "Profile",
    "createPost": "Create Post",
    "logOut": "Log Out",
    "cancel": "Cancel",
    "messages": "Direct",
    "followNotification": "{username} started following you.",
    "messageNotification": "{username} sent you a message.",
    "followRequestNotification": "{username} wants to follow you.",
    "mentionCommentNotification": "{username} mentioned you in a comment: \"{commentText}\"",
    "duoRequestNotification": "<b>{username}</b> wants to create a duo photo with you.",
    "duoAcceptedNotification": "<b>{username}</b> accepted your duo photo request.",
    "duoRefusedNotification": "<b>{username}</b> refused your duo photo request.",
    "accept": "Accept",
    "decline": "Decline"
  },
  "feed": {
    "welcome": "Welcome to Vibe",
    "empty": "It looks like your feed is empty.",
    "emptySuggestion": "Use the search bar to find and follow your friends to see their photos and videos."
  },
  "post": {
    "like": "Like",
    "comment": "Comment",
    "forward": "Forward",
    "moreOptions": "More options",
    "delete": "Delete",
    "likes": "likes",
    "viewAllComments": "View all {count} comments",
    "addComment": "Add a comment...",
    "postButton": "Post",
    "mentionSearching": "Searching...",
    "mentionNoUsers": "No users found.",
    "deleteCommentTitle": "Delete Comment?",
    "deleteCommentBody": "Are you sure you want to delete this comment?",
    "deletePostTitle": "Delete Post?",
    "deletePostBody": "Are you sure you want to delete this post?",
    "deleting": "Deleting...",
    "viewSingular": "view",
    "viewPlural": "views",
    "viewedBy": "Viewed by",
    "noViews": "No views yet.",
    "duoPhoto": "Duo Photo",
    "and": "and",
    "addCaption": "Add Caption",
    "addMusic": "Add Music",
    "addToMemory": "Add to Memory"
  },
  "time": {
    "seconds": "{count}s ago",
    "minutes": "{count}m ago",
    "hours": "{count}h ago",
    "days": "{count}d ago"
  },
  "profile": {
    "editProfile": "Edit Profile",
    "following": "Following",
    "follow": "Follow",
    "message": "Message",
    "posts": "posts",
    "followers": "followers",
    "followingCount": "following",
    "postsTab": "POSTS",
    "pulsesTab": "PULSES",
    "noPosts": "No Posts Yet",
    "noPostsSuggestion": "When this user shares photos, you'll see them here.",
    "noPulses": "No Pulses Yet",
    "noPulsesSuggestion": "This user hasn't shared any pulses.",
    "privateAccountMessage": "This Account is Private",
    "privateAccountSuggestion": "Follow to see their photos and videos.",
    "notFound": "User not found.",
    "followersModalTitle": "Followers",
    "followingModalTitle": "Following",
    "noFollowers": "No followers yet.",
    "notFollowingAnyone": "Not following anyone."
  },
  "editProfile": {
    "title": "Edit Profile",
    "changePhoto": "Change profile photo",
    "usernameLabel": "Username",
    "bioLabel": "Bio",
    "privateAccount": "Private Account",
    "privateAccountInfo": "Only your followers will be able to see your photos and videos.",
    "submit": "Submit",
    "submitting": "Submitting...",
    "updateError": "Failed to update profile. Please try again.",
    "profileMusic": "Profile Music",
    "noProfileMusic": "No music selected.",
    "changeMusic": "Change music",
    "removeMusic": "Remove"
  },
  "createPost": {
    "title": "Create new post",
    "share": "Share",
    "sharing": "Sharing...",
    "captionLabel": "Write a caption...",
    "dragPhotos": "Drag photos here",
    "selectFromComputer": "Select from computer",
    "ventMode": "Vent Mode",
    "ventModeInfo": "Only selected followers will see this post.",
    "searchFollowers": "Search followers...",
    "noFollowersFound": "No followers found.",
    "selectAll": "Select All",
    "deselectAll": "Deselect All",
    "selectedCount": "{count} selected",
    "addMusic": "Add Music",
    "changeMusic": "Change Music",
    "searchMusicPlaceholder": "Search for a song or artist...",
    "search": "Search",
    "searching": "Searching...",
    "musicNoResults": "No songs found.",
    "selectMusic": "Select"
  },
  "messages": {
    "title": "Messages",
    "newMessage": "New message",
    "close": "Close messages",
    "loading": "Loading conversations...",
    "noConversations": "No conversations yet.",
    "back": "Back to conversations",
    "yourMessages": "Your Messages",
    "sendPrivate": "Send private photos and messages to a friend.",
    "seen": "Seen",
    "recording": "Recording...",
    "replyingToSelf": "Replying to yourself",
    "replyingToOther": "Replying to {username}",
    "messagePlaceholder": "Message...",
    "send": "Send",
    "deleteTitle": "Delete Message?",
    "deleteBody": "Are you sure you want to delete this message? This cannot be undone.",
    "newMessageTitle": "New Message",
    "searchUsers": "Search for users...",
    "media": {
      "photo": "Photo",
      "video": "Video",
      "audio": "Voice message",
      "select": "Attach media",
      "uploadError": "Failed to upload media.",
      "videoTooLong": "Video cannot be longer than 30 seconds.",
      "cancelUpload": "Cancel upload",
      "viewMedia": "View media"
    },
    "forwardedPost": "Forwarded a post",
    "anonymousModeOn": "Go anonymous",
    "anonymousModeOff": "Go online",
    "deleteConversationTitle": "Delete Conversation?",
    "deleteConversationBody": "This will permanently delete the conversation for everyone and cannot be undone.",
    "deleteConversationConfirm": "Delete",
    "recordingError": "Could not start recording. Please check microphone permissions.",
    "diariesTitle": "Notes",
    "addNote": "Your Note",
    "replyToNote": "Reply to {username}'s note...",
    "notePlaceholder": "Your note...",
    "viewNote": "View note"
  },
  "diary": {
    "title": "Diary",
    "publish": "Publish",
    "publishing": "Publishing...",
    "placeholder": "What's on your mind today?",
    "empty": "The diary is empty.",
    "emptySuggestion": "Follow people to see their diary entries here or write your own!",
    "alreadyPosted": "You've already posted in your diary today. Come back tomorrow!"
  },
  "forwardModal": {
    "title": "Forward to",
    "search": "Search...",
    "noFollowing": "You aren't following anyone.",
    "noResults": "No users found.",
    "send": "Send",
    "sending": "Sending...",
    "sent": "Sent"
  },
  "duoModal": {
    "title": "Create Duo Photo",
    "description": "Select a friend to share this post with. They will receive a request to accept.",
    "sendRequest": "Send Request",
    "sending": "Sending...",
    "noFollowing": "You aren't following anyone to invite.",
    "requestSent": "Request sent!",
    "alreadyPartnered": "This post already has a duo partner.",
    "requestPending": "There is already a pending request for this post.",
    "requestError": "Failed to send request."
  },
  "crystal": {
    "formed": "A new Connection Crystal was formed!",
    "glowing": "Your connection is glowing!",
    "level": {
        "brilhante": "Brilliant",
        "equilibrado": "Balanced",
        "apagado": "Faded",
        "rachado": "Cracked"
    },
    "title": "Connection Crystal: {status}",
    "streak": "{streak} day interaction streak",
    "shareTitle": "Connection Streak",
    "shareAction": "Share to Pulse",
    "publishing": "Publishing...",
    "shareError": "Failed to publish Pulse.",
    "canvasError": "Failed to generate image.",
    "imageLoadError": "Failed to load profile pictures.",
    "streakDays": "{streak} day connection streak",
    "vibe": "— the vibe continues 💬🔥 —",
    "watermark": "Vibe"
  },
  "createPulse": {
    "title": "Create new pulse",
    "publishing": "Publishing...",
    "publish": "Publish Pulse",
    "captionLabel": "Write a caption... (optional)",
    "selectMedia": "Select an image or video",
    "selectFromComputer": "Select from computer",
    "invalidFileError": "Please select a valid image or video file.",
    "publishError": "Failed to create pulse. Please try again.",
    "ventMode": "Vent Mode",
    "ventModeInfo": "Only selected followers will see this pulse."
  },
  "pulseViewer": {
    "previous": "Previous pulse",
    "next": "Next pulse",
    "delete": "Delete Pulse",
    "deleteTitle": "Delete Pulse?",
    "deleteBody": "Are you sure you want to delete this pulse? This cannot be undone."
  },
  "pulseBar": {
    "viewPulse": "View {username}'s pulse"
  },
  "welcome": {
    "title": "Welcome to Vibe"
  },
  "footer": {
    "language": "English",
    "copyright": "© {year} Vibe",
    "links": {
      "meta": "Meta",
      "about": "About",
      "blog": "Blog",
      "jobs": "Jobs",
      "help": "Help",
      "api": "API",
      "privacy": "Privacy",
      "terms": "Terms",
      "locations": "Locations",
      "lite": "Instagram Lite",
      "threads": "Threads",
      "contact": "Contact Uploading & Non-Users",
      "verified": "Meta Verified"
    }
  },
  "call": {
    "call": "Call",
    "calling": "Calling {username}...",
    "incomingCall": "Incoming call from {username}",
    "answer": "Answer",
    "decline": "Decline",
    "hangUp": "Hang Up",
    "callEnded": "Call ended",
    "callDeclined": "{username} declined the call.",
    "callCancelled": "Call cancelled.",
    "onCallWith": "On call with {username}",
    "enterCallId": "Enter Call ID to join",
    "join": "Join",
    "callId": "Call ID",
    "copyCallId": "Copy ID",
    "copied": "Copied!",
    "callInProgress": "Call in progress...",
    "noMicrophone": "Microphone access denied. Please enable it in your browser settings.",
    "callError": "An error occurred during the call.",
    "videoCall": "Video Call",
    "voiceCall": "Voice Call"
  },
  "resetPassword": {
    "title": "Reset Password",
    "instructions": "Enter your email and we'll send you a link to get back into your account.",
    "emailLabel": "Email address",
    "sendLinkButton": "Send Reset Link",
    "sendingLinkButton": "Sending...",
    "backToLogin": "Back to Login",
    "successMessage": "Check your email for a link to reset your password.",
    "errorNotFound": "Email not found. Please check and try again.",
    "genericError": "Failed to send reset link. Please try again later."
  },
  "addCaptionModal": {
    "title": "Add Caption",
    "captionLabel": "Write a caption...",
    "save": "Save",
    "saving": "Saving...",
    "error": "Failed to save caption. Please try again."
  },
  "addMusicModal": {
    "title": "Add Music"
  },
  "musicSearch": {
    "fetchError": "Failed to fetch music",
    "searchError": "An error occurred during search.",
    "trimInstructions": "Drag to select the 15-second snippet.",
    "done": "Done"
  },
  "musicPlayer": {
    "play": "Play",
    "pause": "Pause"
  },
  "memories": {
    "new": "New",
    "add": "Add",
    "title": "Memories",
    "edit": "Edit Memory",
    "delete": "Delete Memory",
    "deleteConfirm": "Are you sure you want to delete this memory? This cannot be undone.",
    "selectContent": "Select Content",
    "next": "Next",
    "name": "Name",
    "editCover": "Edit Cover",
    "create": "Create",
    "save": "Save",
    "selectItems": "Select the posts and pulses you want to add.",
    "noContent": "You have no posts or pulses to add.",
    "memoryName": "Memory Name",
    "selectCover": "Select a cover",
    "creating": "Creating...",
    "saving": "Saving...",
    "error": "An error occurred. Please try again.",
    "addToMemoryTitle": "Add to Memory",
    "createNew": "Create New Memory",
    "added": "Added!"
  },
  "gallery": {
    "title": "Create new post",
    "selectPhotos": "Select Photos from Gallery",
    "next": "Next",
    "galleryTab": "Gallery",
    "cameraTab": "Camera",
    "capture": "Capture",
    "cameraError": "Could not access camera. Please check permissions."
  },
  "choiceModal": {
    "title": "What do you want to create?",
    "post": "Post",
    "pulse": "Pulse"
  }
};

type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
  loading: boolean; // Keep for compatibility, but always false
}

const messages: Record<Language, any> = {
    pt: ptMessages,
    en: enMessages,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const t = (key: string, replacements?: { [key: string]: string | number }): string => {
    const langMessages = messages[language];
    if (!langMessages) return key;
    
    let message = key.split('.').reduce((o, i) => (o ? o[i] : undefined), langMessages) || key;
    if (replacements && typeof message === 'string') {
      Object.keys(replacements).forEach(placeholder => {
        message = message.replace(`{${placeholder}}`, String(replacements[placeholder]));
      });
    }
    return message;
  };

  return (
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