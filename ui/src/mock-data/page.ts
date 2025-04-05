export interface Page {
	id: number;
	parent: number | null;
	title: string;
}

export const pages: Page[] = [
	{
		id: 1,
		parent: null,
		title: 'Page 1',
	},
	{
		id: 2,
		parent: 1,
		title: 'Page 1',
	},
	{
		id: 3,
		parent: 1,
		title: 'Page 1',
	},
	{
		id: 4,
		parent: 3,
		title: 'Page 1',
	},
	{
		id: 5,
		parent: null,
		title: 'Page 1',
	},
	{
		id: 6,
		parent: 5,
		title: 'Page 1',
	},
];

parent;
