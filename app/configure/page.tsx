import { Metadata } from 'next'
import ConfigurationWizard from './components/ConfigurationWizard'

export const metadata: Metadata = {
  title: 'Configure Your Order - TubeBend',
  description: 'Configure your custom tube bending order with instant pricing and transparent specifications.',
}

export default function ConfigurePage() {
  return <ConfigurationWizard />
}