'use client';

import { type ReactNode } from 'react';
import { IconCheck } from '@tabler/icons-react';
import Button from './Button';
import styles from './StepperFlow.module.css';

/* =========================================================================
   TYPES
   ========================================================================= */

export interface Step {
	/** Unique key for this step */
	key: string;
	/** Step label shown in sidebar */
	label: string;
	/** Optional description below label in sidebar */
	description?: string;
	/** Optional icon (replaces the step number) */
	icon?: ReactNode;
	/** The step's form content */
	content: ReactNode;
	/** Whether this step's form is valid (gates Next button) */
	isValid?: boolean;
	/** Show "(optional)" badge in sidebar */
	isOptional?: boolean;
}

export interface StepperFlowProps {
	steps: Step[];
	/** Current active step index */
	activeStep: number;
	/** Called when step changes (via sidebar click or Next/Back) */
	onStepChange: (step: number) => void;
	/** Called when the user clicks the final submit button */
	onComplete: () => void;
	/** Called when the user cancels */
	onCancel?: () => void;
	/** Label for the final step's submit button (default "Submit") */
	completeLabel?: string;
	/** Show loading spinner on submit button */
	loading?: boolean;
	/** Additional class name */
	className?: string;
}

/* =========================================================================
   STEPPER FLOW
   ========================================================================= */

export default function StepperFlow({
	steps,
	activeStep,
	onStepChange,
	onComplete,
	onCancel,
	completeLabel = 'Submit',
	loading = false,
	className,
}: StepperFlowProps) {
	const isFirstStep = activeStep === 0;
	const isLastStep = activeStep === steps.length - 1;
	const currentStep = steps[activeStep];
	const canProceed = currentStep?.isValid !== false;

	// Track the highest step the user has visited
	// (they can click back to any visited step but can't skip ahead)
	const highestVisited = activeStep;

	const handleBack = () => {
		if (!isFirstStep) onStepChange(activeStep - 1);
	};

	const handleNext = () => {
		if (isLastStep) {
			onComplete();
		} else {
			onStepChange(activeStep + 1);
		}
	};

	const handleStepClick = (index: number) => {
		// Can navigate to any step at or below the highest visited
		if (index <= highestVisited || index <= activeStep) {
			onStepChange(index);
		}
	};

	return (
		<div className={`${styles.container} ${className ?? ''}`}>
			{/* Step sidebar */}
			<div className={styles.sidebar}>
				{steps.map((step, index) => {
					const isCompleted = index < activeStep;
					const isActive = index === activeStep;
					const isFuture = index > activeStep;
					const isClickable = index <= highestVisited || index <= activeStep;

					const stepCls = [
						styles.step,
						isActive && styles.stepActive,
						isCompleted && styles.stepCompleted,
						isFuture && styles.stepFuture,
						isClickable && styles.stepClickable,
					]
						.filter(Boolean)
						.join(' ');

					return (
						<div key={step.key} className={stepCls} onClick={() => isClickable && handleStepClick(index)}>
							{/* Step indicator */}
							<div className={`${styles.indicator} ${isActive ? styles.indicatorActive : ''} ${isCompleted ? styles.indicatorCompleted : ''}`}>
								{isCompleted ? (
									<IconCheck size={14} stroke={2.5} />
								) : step.icon ? (
									step.icon
								) : (
									<span className={styles.indicatorNumber}>{index + 1}</span>
								)}
							</div>

							{/* Step label */}
							<div className={styles.stepContent}>
								<span className={styles.stepLabel}>
									{step.label}
									{step.isOptional && <span className={styles.optional}>(optional)</span>}
								</span>
								{step.description && (
									<span className={styles.stepDescription}>{step.description}</span>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Content area */}
			<div className={styles.main}>
				<div key={currentStep?.key} className={styles.content}>
					{currentStep?.content}
				</div>

				{/* Footer with navigation buttons */}
				<div className={styles.footer}>
					<div className={styles.footerLeft}>
						{isFirstStep && onCancel && (
							<Button variant="text" color="neutral" onClick={onCancel} size="sm">
								Cancel
							</Button>
						)}
						{!isFirstStep && (
							<Button variant="outlined" color="neutral" onClick={handleBack} size="sm">
								Back
							</Button>
						)}
					</div>
					<div className={styles.footerRight}>
						<Button
							onClick={handleNext}
							disabled={!canProceed}
							loading={isLastStep && loading}
							size="sm"
						>
							{isLastStep ? completeLabel : currentStep?.isOptional ? 'Skip' : 'Next'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
