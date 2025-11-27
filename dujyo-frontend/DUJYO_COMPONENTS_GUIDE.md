# 🎨 GUÍA DE COMPONENTES "DUJYO - ORO Y OSCURIDAD"

## 📋 Resumen de Implementación

Esta guía define el sistema de diseño de componentes para Dujyo, basado en la paleta "BASE TECNO-LÚGUBRE" y "OTOÑO EN LLAVAS".

## 🎯 Regla de Oro

- **Dorado/Cobre**: Acciones PRINCIPALES (ganar, comprar, crear, subir, stream)
- **Cian**: Elementos TECH (blockchain, configuraciones, wallet, conexiones)
- **Ámbar**: Elementos SECUNDARIOS pero importantes (hover, cancelar, volver)
- **Negro/Profundo**: El lienzo de TODO

## 📦 Componentes Disponibles

### 1. Botones

#### `.btn-primary` / `.btn-cta`
**Uso**: Botones principales de acción (Comprar, Subir, Stream, Sign In, Sign Up)
```tsx
<button className="btn-primary">Comprar Ahora</button>
```
- Fondo: Gradiente dorado → cobre (#F59E0B → #EA580C)
- Texto: Negro (#0A0A0F) para máximo contraste
- Hover: Más brillante con sombra aumentada

#### `.btn-secondary`
**Uso**: Botones secundarios (Cancelar, Volver, Menos Importante)
```tsx
<button className="btn-secondary">Cancelar</button>
```
- Fondo: Transparente
- Borde: Ámbar (#FBBF24)
- Texto: Ámbar

#### `.btn-tech`
**Uso**: Botones relacionados con tecnología (Conectar Wallet, Configuración Tech)
```tsx
<button className="btn-tech">Conectar Wallet</button>
```
- Fondo: Transparente
- Borde: Cian eléctrico (#00F5FF)
- Texto: Cian eléctrico
- Efecto: Glow tech

### 2. Tarjetas/Cards

#### `.card` / `.card-dujyo`
**Uso**: Tarjetas de contenido (Artistas, Playlists, Juegos, Videos)
```tsx
<div className="card">
  <h3>Título</h3>
  <p>Contenido</p>
</div>
```
- Fondo: #1A1A2E
- Borde: Dorado sutil (rgba(245, 158, 11, 0.2))
- Sombra: Dorada suave
- Hover: Borde más visible, sombra aumentada

#### `.card-tech`
**Uso**: Tarjetas relacionadas con tecnología/blockchain
```tsx
<div className="card-tech">
  <h3>Blockchain Info</h3>
</div>
```
- Fondo: #1A1A2E
- Borde: Cian sutil
- Sombra: Cian suave

### 3. Barras de Progreso

#### `.progress-bar` / `.progress-bar-dujyo` + `.progress-fill`
**Uso**: Barras de progreso (Stream, Carga, Upload)
```tsx
<div className="progress-bar">
  <div className="progress-fill" style={{ width: '60%' }}></div>
</div>
```
- Fondo: #111827
- Fill: Gradiente dorado → cobre
- Efecto: Glow dorado

#### `.progress-bar-tech` + `.progress-fill-tech`
**Uso**: Barras de progreso tech
- Fill: Gradiente cian

### 4. Iconos

#### Clases de iconos por tipo:
```tsx
<Music className="icon-music" />      {/* Dorado #F59E0B */}
<Video className="icon-video" />      {/* Cobre #EA580C */}
<Gamepad className="icon-gaming" />   {/* Cian #00F5FF */}
<Wallet className="icon-wallet" />    {/* Ámbar #FBBF24 */}
<Blockchain className="icon-blockchain" /> {/* Cian #00F5FF */}
```

### 5. Badges/Etiquetas

```tsx
<span className="badge badge-trending">Trending</span>
<span className="badge badge-nft">NFT</span>
<span className="badge badge-new">New</span>
<span className="badge badge-premium">Premium</span>
```

- `.badge-trending`: Cobre (#EA580C) con texto negro
- `.badge-nft`: Cian (#00F5FF) con texto negro
- `.badge-new`: Dorado (#F59E0B) con texto negro
- `.badge-premium`: Gradiente dorado → cobre

### 6. Inputs y Formularios

#### `.input-dujyo` / `.input-primary`
**Uso**: Inputs principales
```tsx
<input className="input-dujyo" placeholder="Escribe aquí..." />
```
- Fondo: #111827
- Borde: Dorado sutil
- Focus: Borde dorado con glow

#### `.input-tech`
**Uso**: Inputs relacionados con tecnología
- Borde: Cian sutil
- Focus: Borde cian con glow

### 7. Links y Enlaces

```tsx
<a className="link-primary">Enlace Principal</a>
<a className="link-tech">Enlace Tech</a>
```

### 8. Alertas y Notificaciones

```tsx
<div className="alert-success">Éxito</div>
<div className="alert-warning">Advertencia</div>
<div className="alert-danger">Peligro</div>
<div className="alert-tech">Info Tech</div>
```

### 9. Utilidades Adicionales

#### Glow Effects
```tsx
<div className="glow-gold">Elemento con glow dorado</div>
<div className="glow-tech">Elemento con glow tech</div>
<div className="glow-copper">Elemento con glow cobre</div>
```

#### Text Gradients
```tsx
<h1 className="text-gradient-gold">Título Dorado</h1>
<h1 className="text-gradient-tech">Título Tech</h1>
```

#### Borders
```tsx
<div className="border-gold">Borde dorado</div>
<div className="border-tech">Borde tech</div>
<div className="border-copper">Borde cobre</div>
```

## 🔄 Migración de Componentes Existentes

### Antes:
```tsx
<button className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/25">
  Comprar
</button>
```

### Después:
```tsx
<button className="btn-primary w-full py-4">
  Comprar
</button>
```

## ✅ Componentes Actualizados

- ✅ `UploadPage.tsx` - Botón de upload
- ✅ `Login.tsx` - Botón de sign in
- ✅ `ExploreNow.tsx` - Botones de sign in/sign up
- ✅ `PurchaseButton.tsx` - Botón de compra

## 📝 Notas Importantes

1. **Texto en botones principales**: Siempre usar texto negro (#0A0A0F) en botones `.btn-primary` para máximo contraste
2. **Consistencia**: Usar las clases de componentes en lugar de estilos inline cuando sea posible
3. **Hover states**: Todos los componentes tienen estados hover definidos
4. **Disabled states**: Todos los botones tienen estados disabled

## 🚀 Próximos Pasos

- [ ] Actualizar más componentes para usar las nuevas clases
- [ ] Crear variantes de tamaño (btn-primary-sm, btn-primary-lg)
- [ ] Agregar animaciones adicionales
- [ ] Documentar casos de uso específicos

