import BasicDialog from '../common/BasicDialog';
import Slideshow from '../common/Slideshow';
import WelcomeSlide from './welcome-slides/WelcomeSlide';

export default function WelcomeDialog() {
	return (
		<BasicDialog
			title='Welcome'
			onClose={() => { }}

		>
			<Slideshow
				slides={[
					{
						order: 0,
						content: <WelcomeSlide />,
						revisitable: false
					},
					{
						order: 1,
						content: <WelcomeSlide />
					}
				]}
				width={600}
				height={300}
			/>
		</BasicDialog>
	);
}