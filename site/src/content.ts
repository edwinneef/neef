export type Message = { kind: 'you' | 'ai' | 'tick' | 'live'; text: string };

export const sessions: { name: string; title: string; messages: Message[] }[] = [
  {
    name: 'New project', title: 'An empty folder, one sentence',
    messages: [
      { kind: 'you', text: '$neef build a booking page for my hair salon: pick a service, a day and a time' },
      { kind: 'ai', text: "On it. I’ll set up Git to save your progress and use a simple web page." },
      { kind: 'tick', text: 'Booking page with services, calendar and time slots' },
      { kind: 'tick', text: 'Confirmation screen after booking' },
      { kind: 'tick', text: 'Checked: booking a slot works, taken slots are blocked' },
      { kind: 'tick', text: 'Checked that it starts; first working version saved' },
      { kind: 'live', text: 'Running on your computer: http://localhost:3000' },
      { kind: 'ai', text: 'Next I’d suggest: email a confirmation to the customer. Type $neef next to keep going.' },
    ],
  },
  {
    name: 'Existing project', title: 'Your project, one improvement',
    messages: [
      { kind: 'you', text: '$neef add a cancel button to my existing booking page' },
      { kind: 'ai', text: 'I’ll read how bookings work and use the tools and style your project already has.' },
      { kind: 'tick', text: 'Added a cancel button using the existing booking code' },
      { kind: 'tick', text: 'Your unfinished changes left alone' },
      { kind: 'tick', text: 'Checked: cancelling frees the slot; other bookings still work' },
      { kind: 'tick', text: 'Checked that it starts; this change saved as a step you can undo' },
      { kind: 'live', text: 'Updated app running on your computer: http://localhost:3000' },
      { kind: 'ai', text: 'Next I’d suggest: let customers reschedule. Type $neef next to keep going.' },
    ],
  },
];

export const examples = [
  { name: 'Build this', command: '$neef <idea>', title: 'Start or change something',
    request: '$neef add a cancel button to the booking page',
    reply: 'Added a cancel button using the existing booking code. Checked that cancelling frees the slot and other bookings still work.',
    result: 'Use this most of the time. Describe the result and it gets on with the job.' },
  { name: 'Keep going', command: '$neef next', title: 'The next useful improvement',
    request: '$neef next', reply: 'Most useful next step: let customers reschedule a booking. Working on that now.',
    result: 'Resumes unfinished work first. When the job is complete, it finds a useful next action and does it.' },
  { name: 'Show me first', command: '$neef prototype', title: 'Try an idea before building it',
    request: '$neef prototype two different looks for the homepage',
    reply: 'Made two clickable versions in a scratch folder. Your real project is untouched. Which direction do you prefer?',
    result: 'A quick demonstration to help you decide before the real project changes.' },
  { name: 'My idea is still vague', command: '$neef shape', title: 'Sharpen the idea, then build',
    request: '$neef shape a loyalty program for regular customers',
    reply: 'One question: points per visit or per euro spent? I’d suggest per visit: it’s simpler. Then I’ll build it.',
    result: 'Asks consequential questions, one at a time, with suggested answers. Then builds the agreed result.' },
  { name: 'Big job, plan it', command: '$neef plan', title: 'Make a plan before a larger change',
    request: '$neef plan let customers manage their own bookings',
    reply: 'Plan saved in three phases: sign in, view bookings, then cancel and reschedule. Use $neef next when you’re ready to build it.',
    result: 'Saves the plan and stops. One $neef next works through the ready phases until complete or blocked.' },
  { name: 'What’s wrong with it?', command: '$neef challenge', title: 'An honest second opinion',
    request: '$neef challenge the booking flow',
    reply: 'Biggest problem: two people can book the same slot at the same moment. That’s what I’d fix first.',
    result: 'Inspects, ranks the problems and recommends an improvement. Changes nothing in your project.' },
  { name: 'Let me choose', command: '$neef options', title: 'Useful options, with reasons',
    request: '$neef options improve the booking page',
    reply: 'I’d start with rescheduling. Other options: clearer opening hours, or a reminder email. Here’s the benefit of each.',
    result: 'Shows grounded choices without starting work. Pick one when you’re ready.' },
];

export const questions = [
  { question: 'Do I have to set anything up for each project?', answer: 'Install NEEF once. In a completely empty folder, it sets up Git automatically to save your work in steps you can undo. If a folder already has files but doesn’t use Git, it asks before setting that up. Projects already using Git keep their existing setup.' },
  { question: 'Can I use it on an existing project?', answer: 'Yes. Add features, fix bugs or improve what you have. NEEF follows your project’s existing tools and code style, makes focused changes and preserves your unfinished edits.' },
  { question: 'Will I be able to open what it builds?', answer: 'It checks that the app or tool starts. When the assistant can leave it running, you get a local address to open in your browser. Otherwise, you get the exact command to run it. Publishing online is a separate request.' },
  { question: 'Is NEEF an AI?', answer: 'No. It’s a set of working rules and a small helper program for the AI assistant you already use: Claude Code or Codex. The assistant does the building; NEEF gives it a consistent way to work.' },
  { question: 'Do I need to be a programmer?', answer: 'You can describe what you want in normal words. NEEF reports what it changed, what it checked and what comes next. You do need Claude Code or Codex, Node.js 20 or newer, and Git installed.' },
  { question: 'How fast is “fast”?', answer: 'The building goes as fast as your AI assistant and the job allow. NEEF reduces repeated explanations and routine approval steps. It still asks when a real decision or extra authority is needed.' },
  { question: 'Where do I get NEEF?', answer: 'NEEF is currently installed from its source folder. This page has no public download yet. If you have the source, use the commands below to preview the installation, then apply it. NEEF itself requires no new account or background service.' },
];
