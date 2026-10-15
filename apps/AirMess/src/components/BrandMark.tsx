import { Image, View } from 'react-native'

/**
 * Bloc de marque AirMess : le logo (aile encre + lame rouge) pose sur une tuile
 * jaune arrondie.
 *
 * Le jaune de la marque reste un accent : c'est cette tuile qui le porte, jamais
 * le fond de l'ecran (un fond jaune plein ecran fatigue l'oeil et noie le logo).
 * Le dessin vient de l'icone de l'app (assets/images/splash-icon.png) : l'ecran
 * de connexion et l'icone du telephone montrent donc le meme logo.
 */

type Size = 'md' | 'lg'

const SIZES: Record<Size, { tile: string; mark: number }> = {
  // 96 px : en-tete des ecrans de connexion et mot de passe oublie.
  md: { tile: 'h-24 w-24 rounded-[28px]', mark: 56 },
  // 160 px : ecran d'attente, centre seul sur le fond sombre.
  lg: { tile: 'h-40 w-40 rounded-[44px]', mark: 96 },
}

interface Props {
  size?: Size
  className?: string
}

export default function BrandMark({ size = 'md', className = '' }: Props) {
  const { tile, mark } = SIZES[size]

  return (
    <View className={['items-center justify-center bg-airmess-yellow', tile, className].join(' ')}>
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={{ width: mark, height: mark }}
        resizeMode="contain"
        accessible={false}
      />
    </View>
  )
}
