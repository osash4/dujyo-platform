/**
 * Help Center Translations
 * All content for Help Center in English and Spanish
 */

export interface HelpArticleContent {
  title: { en: string; es: string };
  content: { en: string; es: string };
}

export const helpCenterArticles: Record<string, HelpArticleContent> = {
  'first-song': {
    title: {
      en: 'How to Upload Your First Song',
      es: 'Cómo subir tu primera canción',
    },
    content: {
      en: `## How to Upload Your First Song on Dujyo

### Step 1: Access the Content Hub
1. Navigate to your Artist Dashboard
2. Click on "Content Hub" in the sidebar
3. Select "Upload Music"

### Step 2: Prepare Your File
- **Format**: MP3, WAV, FLAC, M4A
- **Max Size**: 50MB per song
- **Recommended Quality**: Minimum 320kbps for MP3

### Step 3: Complete the Information
- **Title**: Name of your song
- **Artist**: Your artist name
- **Genre**: Select the most appropriate genre
- **Description**: Tell your fans about the song
- **Cover**: Upload an image (JPG/PNG, minimum 1000x1000px)

### Step 4: Configure Royalties
- Define royalty percentage for co-creators
- Set license prices (if applicable)
- Configure NFT options

### Step 5: Publish
- Review all information
- Click "Publish"
- Your song will be available in minutes!

**Tip**: Make sure you have the rights to the music you upload.`,
      es: `## Cómo subir tu primera canción en Dujyo

### Paso 1: Accede al Content Hub
1. Navega a tu Dashboard como artista
2. Haz clic en "Content Hub" en el sidebar
3. Selecciona "Upload Music"

### Paso 2: Prepara tu archivo
- **Formato**: MP3, WAV, FLAC, M4A
- **Tamaño máximo**: 50MB por canción
- **Calidad recomendada**: Mínimo 320kbps para MP3

### Paso 3: Completa la información
- **Título**: Nombre de tu canción
- **Artista**: Tu nombre artístico
- **Género**: Selecciona el género más apropiado
- **Descripción**: Cuéntale a tus fans sobre la canción
- **Portada**: Sube una imagen (JPG/PNG, mínimo 1000x1000px)

### Paso 4: Configura royalties
- Define el porcentaje de royalties para co-creadores
- Establece precios de licencia (si aplica)
- Configura opciones de NFT

### Paso 5: Publica
- Revisa toda la información
- Haz clic en "Publish"
- ¡Tu canción estará disponible en minutos!

**Consejo**: Asegúrate de tener los derechos de la música que subes.`,
    },
  },
  'first-video': {
    title: {
      en: 'How to Upload Your First Video',
      es: 'Cómo subir tu primer video',
    },
    content: {
      en: `## How to Upload Your First Video on Dujyo

### Supported Formats
- MP4, MOV, AVI, WebM
- Resolution: 720p minimum, 4K maximum
- Duration: No limit

### Upload Process
1. Go to "Content Hub" → "Video Content"
2. Select your file
3. Complete metadata (title, description, tags)
4. Configure monetization
5. Publish and share

**Tip**: Longer videos take more time to process.`,
      es: `## Cómo subir tu primer video en Dujyo

### Formatos soportados
- MP4, MOV, AVI, WebM
- Resolución: 720p mínimo, 4K máximo
- Duración: Sin límite

### Proceso de upload
1. Ve a "Content Hub" → "Video Content"
2. Selecciona tu archivo
3. Completa metadata (título, descripción, tags)
4. Configura monetización
5. Publica y comparte

**Tip**: Los videos más largos tardan más en procesar.`,
    },
  },
  'earn-royalties': {
    title: {
      en: 'How to Earn Royalties on Dujyo',
      es: 'Cómo ganar royalties en Dujyo',
    },
    content: {
      en: `## How to Earn Royalties on Dujyo

### Types of Earnings

#### 1. Streaming Royalties
- **Music**: Earn DYO for every stream of your songs
- **Videos**: Earn for every view
- **Gaming**: Earn for every hour of gameplay

#### 2. NFT Sales
- NFT licenses for your content
- Special collections
- Secondary market

#### 3. Discovery Rewards
- Users who discover your content earn tokens
- You share part of those rewards

### How to Maximize Your Earnings
1. **Upload content regularly**: More content = more streams
2. **Engage with your audience**: Responding to comments increases engagement
3. **Promote your content**: Share on social media
4. **Collaborate with other artists**: Features increase reach
5. **Stake your tokens**: Earn passive rewards

### Withdrawing Funds
- Minimum: 100 DYO
- Fee: 2% (automatic)
- Time: 24-48 hours
- Methods: Crypto wallet, Bank transfer, Stripe`,
      es: `## Cómo ganar royalties en Dujyo

### Tipos de ganancias

#### 1. Streaming Royalties
- **Música**: Ganas DYO por cada stream de tus canciones
- **Videos**: Ganas por cada visualización
- **Gaming**: Ganas por cada hora de gameplay

#### 2. NFT Sales
- Licencias NFT de tu contenido
- Colecciones especiales
- Mercado secundario

#### 3. Discovery Rewards
- Los usuarios que descubren tu contenido ganan tokens
- Compartes parte de esas recompensas

### Cómo maximizar tus ganancias
1. **Sube contenido regularmente**: Más contenido = más streams
2. **Interactúa con tu audiencia**: Responder comments aumenta engagement
3. **Promociona tu contenido**: Comparte en redes sociales
4. **Colabora con otros artistas**: Los features aumentan reach
5. **Stake tus tokens**: Gana rewards pasivos

### Retiro de fondos
- Mínimo: 100 DYO
- Fee: 2% (automático)
- Tiempo: 24-48 horas
- Métodos: Crypto wallet, Bank transfer, Stripe`,
    },
  },
  'use-dex': {
    title: {
      en: 'How to Use the Integrated DEX',
      es: 'Cómo usar el DEX integrado',
    },
    content: {
      en: `## How to Use the Integrated DEX on Dujyo

### What is the DEX?
The DEX (Decentralized Exchange) allows you to swap tokens directly on Dujyo.

### Quick Swap from Dashboard
1. Go to your Artist Dashboard
2. Locate the "Quick Swap" card
3. Enter the amount of DYO to convert
4. Select DYS (stablecoin)
5. Confirm the transaction

### Full Swaps
1. Navigate to "DEX" in the main menu
2. Select source and destination tokens
3. Review the rate and fees
4. Confirm the swap

### Token Staking
1. Go to the "Staking" section
2. Select amount of DYO to stake
3. Choose the period (flexible or locked)
4. Confirm and start earning rewards

### Tips
- **Best time**: Rates change based on liquidity
- **Fees**: Always review fees before confirming
- **Slippage**: Configure slippage tolerance according to your needs
- **Gas fees**: Minimal thanks to our optimized blockchain`,
      es: `## Cómo usar el DEX integrado en Dujyo

### ¿Qué es el DEX?
El DEX (Decentralized Exchange) te permite intercambiar tokens directamente en Dujyo.

### Swap rápido desde Dashboard
1. Ve a tu Artist Dashboard
2. Localiza el "Quick Swap" card
3. Ingresa la cantidad de DYO a convertir
4. Selecciona DYS (stablecoin)
5. Confirma la transacción

### Swaps completos
1. Navega a "DEX" en el menú principal
2. Selecciona tokens de origen y destino
3. Revisa el rate y fees
4. Confirma el swap

### Staking de tokens
1. Ve a la sección "Staking"
2. Selecciona cantidad de DYO a stakear
3. Elige el período (flexible o locked)
4. Confirma y empieza a ganar rewards

### Tips
- **Mejor momento**: Los rates cambian según liquidez
- **Fees**: Siempre revisa los fees antes de confirmar
- **Slippage**: Configura tolerancia al slippage según tu necesidad
- **Gas fees**: Son mínimos gracias a nuestra blockchain optimizada`,
    },
  },
  'staking-tokens': {
    title: {
      en: 'How to Stake Tokens',
      es: 'Cómo hacer staking de tokens',
    },
    content: {
      en: `## How to Stake Tokens on Dujyo

### What is Staking?
Staking is locking your tokens to support the network and earn passive rewards.

### Types of Staking

#### 1. Flexible Staking
- **Withdrawal**: Anytime
- **APY**: 5-8%
- **Minimum**: 10 DYO

#### 2. Locked Staking
- **Periods**: 30, 60, 90, 180 days
- **APY**: 8-15% (longer = more rewards)
- **Minimum**: 100 DYO

#### 3. Validator Staking
- **Requirement**: Minimum 10,000 DYO
- **APY**: 15-25%
- **Responsibilities**: Validate transactions

### How to Stake
1. Go to "Staking" in the menu
2. Select staking type
3. Enter amount of DYO
4. Review APY and terms
5. Confirm the transaction

### Rewards
- Calculated every block
- Distributed daily
- You can unstake (depending on type) and withdraw rewards

**Note**: Rewards are automatically added to your balance.`,
      es: `## Cómo hacer staking de tokens en Dujyo

### ¿Qué es Staking?
Staking es bloquear tus tokens para apoyar la red y ganar rewards pasivos.

### Tipos de staking

#### 1. Flexible Staking
- **Retiro**: Anytime
- **APY**: 5-8%
- **Mínimo**: 10 DYO

#### 2. Locked Staking
- **Períodos**: 30, 60, 90, 180 días
- **APY**: 8-15% (más largo = más rewards)
- **Mínimo**: 100 DYO

#### 3. Validator Staking
- **Requisito**: Mínimo 10,000 DYO
- **APY**: 15-25%
- **Responsabilidades**: Validar transacciones

### Cómo stakear
1. Ve a "Staking" en el menú
2. Selecciona tipo de staking
3. Ingresa cantidad de DYO
4. Revisa APY y términos
5. Confirma la transacción

### Rewards
- Se calculan cada bloque
- Se distribuyen diariamente
- Puedes unstake (según tipo) y retirar rewards

**Nota**: Los rewards se suman automáticamente a tu balance.`,
    },
  },
  'multistreaming': {
    title: {
      en: 'Multistreaming Platform',
      es: 'Plataforma Multistreaming',
    },
    content: {
      en: `## Dujyo: Multistreaming Platform

Dujyo is not just music. It's a complete decentralized entertainment platform.

### Supported Content
- **🎵 Music**: Songs, albums, podcasts
- **🎥 Video**: Videos, shorts, live streams
- **🎮 Gaming**: Game clips, streams, tournaments
- **✍️ Writing**: Stories, blogs, scripts (coming soon)

### Unified Metrics
Your dashboard shows:
- Total earnings across all content types
- Total engagement (streams + views + hours)
- Total audience (unique users)

### Advantages
- **One place**: Manage all your content
- **Unified metrics**: See the complete picture
- **Cross-platform**: Your fans can follow you across all formats`,
      es: `## Dujyo: Plataforma Multistreaming

Dujyo no es solo música. Es una plataforma completa de entretenimiento descentralizado.

### Contenido soportado
- **🎵 Música**: Canciones, álbumes, podcasts
- **🎥 Video**: Videos, shorts, live streams
- **🎮 Gaming**: Game clips, streams, tournaments
- **✍️ Escritura**: Stories, blogs, scripts (próximamente)

### Métricas unificadas
Tu dashboard muestra:
- Total earnings across all content types
- Total engagement (streams + views + hours)
- Total audience (unique users)

### Ventajas
- **Un solo lugar**: Gestiona todo tu contenido
- **Métricas unificadas**: Ve el panorama completo
- **Cross-platform**: Tus fans pueden seguirte en todos los formatos`,
    },
  },
  'nft-licenses': {
    title: {
      en: 'NFT Licenses and Collections',
      es: 'NFT Licenses y Colecciones',
    },
    content: {
      en: `## NFT Licenses on Dujyo

### What are NFT Licenses?
Each piece of content can have a unique NFT license that allows:
- Verifiable ownership
- Rights transfer
- Automatic royalties
- Marketplace trading

### Create NFT License
1. Upload your content
2. Enable "NFT License" in options
3. Set price and supply
4. Publish and mint

### Buy NFT License
1. Navigate to the content
2. Click "Buy License"
3. Confirm the transaction
4. Receive the NFT in your wallet

**Benefit**: NFT holders receive automatic royalties.`,
      es: `## NFT Licenses en Dujyo

### ¿Qué son las NFT Licenses?
Cada pieza de contenido puede tener una licencia NFT única que permite:
- Ownership verificable
- Transferencia de derechos
- Royalties automáticos
- Marketplace trading

### Crear NFT License
1. Sube tu contenido
2. Activa "NFT License" en opciones
3. Configura precio y supply
4. Publica y mint

### Comprar NFT License
1. Navega al contenido
2. Haz clic en "Buy License"
3. Confirma la transacción
4. Recibe el NFT en tu wallet

**Beneficio**: Los holders de NFT reciben royalties automáticos.`,
    },
  },
  'faq-general': {
    title: {
      en: 'General Frequently Asked Questions',
      es: 'Preguntas Frecuentes Generales',
    },
    content: {
      en: `## Frequently Asked Questions

### Is it free to use Dujyo?
Yes, creating an account and uploading content is free. You only pay transaction fees.

### How do I earn money as an artist?
- Streaming royalties
- NFT sales
- Discovery rewards
- Staking rewards

### How do I earn tokens as a user?
- Listening to music (stream-to-earn)
- Watching videos
- Playing games
- Discovering new content

### Can I withdraw my earnings?
Yes, with a minimum of 100 DYO. A 2% fee applies.

### What is DYO?
DYO is Dujyo's native token. It's used for:
- Payments and royalties
- Staking
- Governance (coming soon)
- Trading on DEX

### Do I need an external wallet?
No. Dujyo has its own blockchain and integrated wallet. The native Dujyo wallet is created automatically and works directly with the platform.

### Is my content protected?
Yes, everything is on the blockchain. Ownership and royalties are immutable.`,
      es: `## Preguntas Frecuentes

### ¿Es gratis usar Dujyo?
Sí, crear cuenta y subir contenido es gratis. Solo pagas fees de transacción.

### ¿Cómo gano dinero como artista?
- Streaming royalties
- NFT sales
- Discovery rewards
- Staking rewards

### ¿Cómo gano tokens como usuario?
- Escuchando música (stream-to-earn)
- Viendo videos
- Jugando juegos
- Descubriendo nuevo contenido

### ¿Puedo retirar mis ganancias?
Sí, con un mínimo de 100 DYO. Fees del 2% aplican.

### ¿Qué es DYO?
DYO es el token nativo de Dujyo. Se usa para:
- Pagos y royalties
- Staking
- Governance (próximamente)
- Trading en DEX

### ¿Necesito wallet externa?
No. Dujyo tiene su propia blockchain y wallet integrada. La wallet nativa de Dujyo se crea automáticamente y funciona directamente con la plataforma.

### ¿Mi contenido está protegido?
Sí, todo está en blockchain. Ownership y royalties son inmutables.`,
    },
  },
  'faq-technical': {
    title: {
      en: 'Technical Questions',
      es: 'Preguntas Técnicas',
    },
    content: {
      en: `## Technical FAQ

### What blockchain does Dujyo use?
Dujyo uses its own optimized blockchain with CPV (Consensus Protocol Validator).

### How much does a transaction cost?
Fees are minimal thanks to our optimized blockchain (~0.001 DYO).

### What file formats do you accept?
- Audio: MP3, WAV, FLAC, M4A
- Video: MP4, MOV, AVI, WebM
- Images: JPG, PNG, GIF

### Is there a size limit?
- Audio: 50MB per file
- Video: 500MB per file
- Images: 10MB per file

### How does processing work?
Content is processed in the background. You'll receive a notification when it's ready.

### Can I edit content after publishing?
Yes, you can edit metadata but not the original file.`,
      es: `## FAQ Técnico

### ¿Qué blockchain usa Dujyo?
Dujyo usa su propia blockchain optimizada con CPV (Consensus Protocol Validator).

### ¿Cuánto cuesta una transacción?
Fees son mínimos gracias a nuestra blockchain optimizada (~0.001 DYO).

### ¿Qué formatos de archivo aceptan?
- Audio: MP3, WAV, FLAC, M4A
- Video: MP4, MOV, AVI, WebM
- Imágenes: JPG, PNG, GIF

### ¿Hay límite de tamaño?
- Audio: 50MB por archivo
- Video: 500MB por archivo
- Imágenes: 10MB por archivo

### ¿Cómo funciona el procesamiento?
El contenido se procesa en background. Recibirás notificación cuando esté listo.

### ¿Puedo editar contenido después de publicar?
Sí, puedes editar metadata pero no el archivo original.`,
    },
  },
};

