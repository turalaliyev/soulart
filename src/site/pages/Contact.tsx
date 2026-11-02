import ContactSection from '../ContactSection';
import { useTitle } from '../motion';

export default function Contact() {
  useTitle('Contact');
  return <ContactSection asPageHeading />;
}
