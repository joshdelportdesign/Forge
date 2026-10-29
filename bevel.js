// Bevel is a small, lesson-aware companion. Guidance is drawn from the curriculum.
export const bevelAssets = {
  welcome:'assets/bevel-welcome.png',
  focus:'assets/bevel-focus.png',
  celebrate:'assets/bevel-celebrate.png'
};

export function bevelMessage({view,day,mission,timer,completed,mistakes,reaction,quiet=false,now=Date.now()}){
  const recent=!quiet&&reaction&&reaction.until>now;
  if(recent){
    if(reaction.kind==='mission')return {pose:'celebrate',text:reaction.dayComplete?`All three missions. A solid day! You earned ${reaction.xp} XP, including your 25 XP day bonus.`:`One more piece in place. ${reaction.xp} XP earned! Take a breath, then choose your next step.`};
    if(reaction.kind==='retest')return {pose:'celebrate',text:'You repeated the fix without help. That’s a skill you can use again.'};
    if(reaction.kind==='timer')return {pose:'celebrate',text:'That’s your focus session. Take a short break, then record what you finished.'};
    if(reaction.kind==='mistake')return {pose:'welcome',text:'Useful clue saved. We have a clear next attempt—one feature at a time.'};
    if(reaction.kind==='hello')return {pose:'welcome',text:'Hi, I’m Bevel. Small steps. Solid shape. Let’s build the next one together.'};
  }
  if(timer?.deadline&&timer.deadline>now)return {pose:'focus',text:'I’ll keep the workshop quiet. One feature at a time—you’ve got this.'};
  if(view==='mistakes'){
    const due=mistakes.filter(m=>!m.resolved&&m.due<=day.today).length;
    return {pose:'welcome',text:due?`${due} learning moment${due===1?' is':'s are'} ready for another try. Pick one and repeat the fix without help.`:'A wrong result is a useful clue. Capture the cause and give yourself one clear next attempt.'};
  }
  if(view==='calendar')return {pose:'welcome',text:'Give your practice a real place in the day. Review the proposed times before adding them to Calendar.'};
  if(view==='resources')return {pose:'welcome',text:'Start with the exercise for your current day. A short look at tool help, then back to building.'};
  if(view==='settings')return {pose:'welcome',text:'Your workshop, your pace. Quiet mode keeps me still and skips celebratory reactions.'};
  if(view==='path')return {pose:'welcome',text:'Every numbered stop is open. Revisit a tricky skill whenever you need; progress comes from practice.'};
  if(completed)return {pose:'welcome',text:'You’ve saved the evidence for this mission. Ready for the next piece, or another practice attempt?'};
  return {pose:'welcome',text:[
    'First, understand the idea. Then make it your own in SOLIDWORKS. I’m right here if you want a tip.',
    'Time to build. Read every view, plan your features, and check the result after each change.',
    'Before moving on, name one thing that worked and one thing to try again. That’s how the skill sticks.'
  ][mission]};
}

export function bevelTips({view,day,mission}){
  if(view==='calendar')return ['Choose a study window you can actually keep. I’ll help flag sessions that cannot fit.','The export includes the exact task, resource links and a ten-minute reminder.','Your exam start time comes from your lecturer; the study planner leaves exam day unscheduled.'];
  if(view==='mistakes')return ['Write the first cause, not just “wrong mass”. Was it units, material, a missing cut or configuration scope?','A clear re-test is small: repeat the failed operation from a clean starting point.','Mark it resolved after the unaided repeat works. Understanding the fix is the first step.'];
  if(view==='settings')return ['Export a progress backup occasionally—especially before changing devices.','Quiet mode is saved with your study preferences. Your device’s reduced-motion preference also stops my movement.'];
  if(view==='path')return ['Choose an unfinished day to find its exact lessons and finish line.','XP records completed work. For readiness, check your timed practice results and remaining errors.'];
  if(view==='resources')return ['The official sample is for Segment 1. Use configuration and assembly exercises for the other rehearsals.','Use the problem number in your mission to find the matching free PDF in the official practice database.'];
  return [mission===0?day.recall[1]:mission===1?day.steps[0]:day.recall[0],`Your finish line: ${day.proof}`,`Today’s exercise: ${day.problems}. Save your result before moving on.`];
}
