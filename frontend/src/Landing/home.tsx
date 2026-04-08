
import Hero from '../components/Hero'

type HomeProps = {
  isDarkMode: boolean
}

const Home = ({ isDarkMode }: HomeProps) => {
  return <Hero isDarkMode={isDarkMode} />
}

export default Home
