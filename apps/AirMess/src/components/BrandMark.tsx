import { Image, View } from 'react-native'

/**
 * Marque AirMess : le logo (aile encre + lame rouge) de l'icone de l'app.
 *
 * Deux variantes, pour ne jamais poser du jaune sur du jaune :
 *   - `tile` : tuile jaune arrondie + logo, sur les fonds creme ou sombres
 *     (connexion, mot de passe oublie). Le jaune y reste un accent : un fond
 *     jaune plein ecran fatigue l'oeil et noie le logo sur un ecran de lecture.
 *   - `bare` : logo seul, pour le splash de demarrage dont le fond est jaune
 *     (voir BrandSplash et expo-splash-screen dans app.json).
 *
 * Le dessin vient de l'icone de l'app (assets/images/splash-icon.png) : les
 * ecrans et l'icone du telephone montrent donc le meme logo.
 */

type Variant = 'tile' | 'bare'

interface Props {
  variant?: Variant
  className?: string
}

/** Tuile des ecrans de connexion / mot de passe oublie. */
const TILE = { classes: 'h-24 w-24 rounded-[28px]', mark: 56 }

/**
 * Marque seule du splash : 220 px de large, soit exactement la taille demandee
 * a expo-splash-screen (`imageWidth: 220`), pour que le passage splash natif ->
 * splash JS ne bouge pas d'un pixel.
 */
const BARE = { width: 220, height: 143 }

export default function BrandMark({ variant = 'tile', className = '' }: Props) {
  return (
    <View
      className={[
        'items-center justify-center',
        variant === 'tile' ? `bg-airmess-yellow ${TILE.classes}` : '',
        className,
      ].join(' ')}
    >
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={variant === 'tile' ? { width: TILE.mark, height: TILE.mark } : BARE}
        resizeMode="contain"
        accessible={false}
      />
    </View>
  )
}
