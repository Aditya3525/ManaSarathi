import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type OptionTemplate = {
  value: number;
  text: string;
};

type BaseQuestion = {
  key: string;
  text: string;
  responseType: 'scale' | 'yes_no' | 'multiple_choice';
  options: OptionTemplate[];
};

type QuestionSeed = {
  id: string;
  text: string;
  order: number;
  responseType: 'scale' | 'yes_no' | 'multiple_choice';
  options: {
    id: string;
    value: number;
    text: string;
    order: number;
  }[];
};

type ScoringConfig = {
  minScore: number;
  maxScore: number;
  interpretationBands: Array<{
    max: number;
    label: string;
    color: string;
  }>;
};

type AssessmentSeed = {
  id: string;
  name: string;
  type: 'Basic' | 'Advanced' | 'Combined';
  category: string;
  description: string;
  timeEstimate?: string;
  isActive?: boolean;
  isBasicOverallOnly?: boolean;
  visibleInMainList?: boolean;
  scoringConfig?: ScoringConfig;
  questions: QuestionSeed[];
};

const OPTIONS_0_TO_3: OptionTemplate[] = [
  { value: 0, text: 'Not at all' },
  { value: 1, text: 'Several days' },
  { value: 2, text: 'More than half the days' },
  { value: 3, text: 'Nearly every day' }
];

const OPTIONS_0_TO_4: OptionTemplate[] = [
  { value: 0, text: 'Never' },
  { value: 1, text: 'Almost never' },
  { value: 2, text: 'Sometimes' },
  { value: 3, text: 'Fairly often' },
  { value: 4, text: 'Very often' }
];

const OPTIONS_1_TO_4: OptionTemplate[] = [
  { value: 1, text: 'Almost never' },
  { value: 2, text: 'Sometimes' },
  { value: 3, text: 'Often' },
  { value: 4, text: 'Almost always' }
];

const OPTIONS_1_TO_5: OptionTemplate[] = [
  { value: 1, text: 'Strongly disagree' },
  { value: 2, text: 'Disagree' },
  { value: 3, text: 'Neutral' },
  { value: 4, text: 'Agree' },
  { value: 5, text: 'Strongly agree' }
];

const OPTIONS_1_TO_7: OptionTemplate[] = [
  { value: 1, text: 'Completely disagree' },
  { value: 2, text: 'Disagree' },
  { value: 3, text: 'Slightly disagree' },
  { value: 4, text: 'Neutral' },
  { value: 5, text: 'Slightly agree' },
  { value: 6, text: 'Agree' },
  { value: 7, text: 'Completely agree' }
];

const OPTIONS_PCL5: OptionTemplate[] = [
  { value: 0, text: 'Not at all' },
  { value: 1, text: 'A little bit' },
  { value: 2, text: 'Moderately' },
  { value: 3, text: 'Quite a bit' },
  { value: 4, text: 'Extremely' }
];

const OPTIONS_YES_NO: OptionTemplate[] = [
  { value: 1, text: 'Yes' },
  { value: 0, text: 'No' }
];

const OPTIONS_BROODING: OptionTemplate[] = [
  { value: 1, text: 'Almost never' },
  { value: 2, text: 'Sometimes' },
  { value: 3, text: 'Often' },
  { value: 4, text: 'Almost always' }
];

const OPTIONS_MINI_IPIP: OptionTemplate[] = [
  { value: 1, text: 'Very inaccurate' },
  { value: 2, text: 'Moderately inaccurate' },
  { value: 3, text: 'Neither accurate nor inaccurate' },
  { value: 4, text: 'Moderately accurate' },
  { value: 5, text: 'Very accurate' }
];

function buildQuestions(
  items: BaseQuestion[],
  startOrder = 1,
  idPrefix = ''
): QuestionSeed[] {
  return items.map((item, index) => {
    const questionId = idPrefix ? `${idPrefix}_${item.key}` : item.key;
    return {
      id: questionId,
      text: item.text,
      order: startOrder + index,
      responseType: item.responseType,
      options: item.options.map((option, optionIndex) => ({
        id: `${questionId}_opt${optionIndex + 1}`,
        value: option.value,
        text: option.text,
        order: optionIndex + 1
      }))
    };
  });
}

const PHQ2_BASE: BaseQuestion[] = [
  {
    key: 'phq2_q1',
    text: 'Little interest or pleasure in doing things',
    responseType: 'scale',
    options: OPTIONS_0_TO_3
  },
  {
    key: 'phq2_q2',
    text: 'Feeling down, depressed, or hopeless',
    responseType: 'scale',
    options: OPTIONS_0_TO_3
  }
];

const GAD2_BASE: BaseQuestion[] = [
  {
    key: 'gad2_q1',
    text: 'Feeling nervous, anxious, or on edge',
    responseType: 'scale',
    options: OPTIONS_0_TO_3
  },
  {
    key: 'gad2_q2',
    text: 'Not being able to stop or control worrying',
    responseType: 'scale',
    options: OPTIONS_0_TO_3
  }
];

const PSS4_BASE: BaseQuestion[] = [
  {
    key: 'pss4_q1',
    text: 'Felt that you were unable to control the important things in your life',
    responseType: 'scale',
    options: OPTIONS_0_TO_4
  },
  {
    key: 'pss4_q2',
    text: 'Felt confident about your ability to handle your personal problems',
    responseType: 'scale',
    options: OPTIONS_0_TO_4
  },
  {
    key: 'pss4_q3',
    text: 'Felt that things were going your way',
    responseType: 'scale',
    options: OPTIONS_0_TO_4
  },
  {
    key: 'pss4_q4',
    text: 'Felt difficulties were piling up so high that you could not overcome them',
    responseType: 'scale',
    options: OPTIONS_0_TO_4
  }
];

const RRS4_BASE: BaseQuestion[] = [
  {
    key: 'rrs4_q1',
    text: 'I think about how sad I feel',
    responseType: 'scale',
    options: OPTIONS_1_TO_4
  },
  {
    key: 'rrs4_q2',
    text: 'I analyze recent events to try to understand why I feel this way',
    responseType: 'scale',
    options: OPTIONS_1_TO_4
  },
  {
    key: 'rrs4_q3',
    text: "I keep thinking about mistakes I've made",
    responseType: 'scale',
    options: OPTIONS_1_TO_4
  },
  {
    key: 'rrs4_q4',
    text: 'I find myself replaying the same thoughts over and over',
    responseType: 'scale',
    options: OPTIONS_1_TO_4
  }
];

const EQ5_BASE: BaseQuestion[] = [
  {
    key: 'eq5_q1',
    text: 'I am aware of my emotions as they happen',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'eq5_q2',
    text: 'I usually stay calm even in stressful situations',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'eq5_q3',
    text: 'I can easily understand how others are feeling',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'eq5_q4',
    text: 'I know how to motivate myself when I feel discouraged',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'eq5_q5',
    text: 'I manage conflicts with others in a constructive way',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  }
];

const BIG_FIVE_BASE: BaseQuestion[] = [
  {
    key: 'bigfive_q1',
    text: 'I see myself as someone who is talkative',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'bigfive_q2',
    text: 'I see myself as someone who tends to be lazy',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'bigfive_q3',
    text: 'I see myself as someone who worries a lot',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'bigfive_q4',
    text: 'I see myself as someone who is curious about many different things',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  },
  {
    key: 'bigfive_q5',
    text: 'I see myself as someone who is helpful and unselfish with others',
    responseType: 'scale',
    options: OPTIONS_1_TO_5
  }
];

const PCPTSD5_BASE: BaseQuestion[] = [
  {
    key: 'pcptsd5_q1',
    text: 'Had nightmares about it or thought about it when you did not want to?',
    responseType: 'yes_no',
    options: OPTIONS_YES_NO
  },
  {
    key: 'pcptsd5_q2',
    text: 'Tried hard not to think about it or went out of your way to avoid situations?',
    responseType: 'yes_no',
    options: OPTIONS_YES_NO
  },
  {
    key: 'pcptsd5_q3',
    text: 'Were constantly on guard, watchful, or easily startled?',
    responseType: 'yes_no',
    options: OPTIONS_YES_NO
  },
  {
    key: 'pcptsd5_q4',
    text: 'Felt numb or detached from people, activities, or your surroundings?',
    responseType: 'yes_no',
    options: OPTIONS_YES_NO
  },
  {
    key: 'pcptsd5_q5',
    text: 'Felt guilty or unable to stop blaming yourself or others?',
    responseType: 'yes_no',
    options: OPTIONS_YES_NO
  }
];

const PHQ9_BASE: BaseQuestion[] = [
  { key: 'phq9_q1', text: 'Little interest or pleasure in doing things', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q2', text: 'Feeling down, depressed, or hopeless', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q3', text: 'Trouble falling or staying asleep, or sleeping too much', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q4', text: 'Feeling tired or having little energy', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q5', text: 'Poor appetite or overeating', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q6', text: 'Feeling bad about yourself — or that you are a failure', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q7', text: 'Trouble concentrating on things', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q8', text: 'Moving or speaking slowly or being so fidgety or restless that you move around a lot more than usual', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'phq9_q9', text: 'Thoughts that you would be better off dead or of hurting yourself', responseType: 'scale', options: OPTIONS_0_TO_3 }
];

const GAD7_BASE: BaseQuestion[] = [
  { key: 'gad7_q1', text: 'Feeling nervous, anxious, or on edge', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'gad7_q2', text: 'Not being able to stop or control worrying', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'gad7_q3', text: 'Worrying too much about different things', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'gad7_q4', text: 'Trouble relaxing', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'gad7_q5', text: 'Being so restless that it is hard to sit still', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'gad7_q6', text: 'Becoming easily annoyed or irritable', responseType: 'scale', options: OPTIONS_0_TO_3 },
  { key: 'gad7_q7', text: 'Feeling afraid as if something awful might happen', responseType: 'scale', options: OPTIONS_0_TO_3 }
];

const PSS10_BASE: BaseQuestion[] = [
  { key: 'pss10_q1', text: 'Been upset because of something that happened unexpectedly?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q2', text: 'Felt that you were unable to control the important things in your life?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q3', text: 'Felt nervous and "stressed"?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q4', text: 'Dealt successfully with irritating life hassles?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q5', text: 'Felt that you were effectively coping with important changes in your life?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q6', text: 'Felt confident about your ability to handle your personal problems?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q7', text: 'Felt that things were going your way?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q8', text: 'Found that you could not cope with all the things that you had to do?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q9', text: 'Been able to control irritations in your life?', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'pss10_q10', text: 'Felt that difficulties were piling up so high that you could not overcome them?', responseType: 'scale', options: OPTIONS_0_TO_4 }
];

const PCL5_BASE: BaseQuestion[] = [
  { key: 'pcl5_q1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q2', text: 'Repeated, disturbing dreams of the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q3', text: 'Suddenly feeling or acting as if the stressful experience were happening again', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q4', text: 'Feeling very upset when something reminded you of the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q5', text: 'Having strong physical reactions when reminded of the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q7', text: 'Avoiding external reminders of the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q8', text: 'Trouble remembering important parts of the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q9', text: 'Having strong negative beliefs about yourself, other people, or the world', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q10', text: 'Blaming yourself or someone else for the stressful experience', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q11', text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q12', text: 'Loss of interest in activities that you used to enjoy', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q13', text: 'Feeling distant or cut off from other people', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q14', text: 'Trouble experiencing positive feelings', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q15', text: 'Irritable behavior, angry outbursts, or acting aggressively', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q16', text: 'Taking too many risks or doing things that could cause you harm', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q17', text: 'Being "super-alert," watchful, or on guard', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q18', text: 'Feeling jumpy or easily startled', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q19', text: 'Difficulty concentrating', responseType: 'scale', options: OPTIONS_PCL5 },
  { key: 'pcl5_q20', text: 'Trouble falling or staying asleep', responseType: 'scale', options: OPTIONS_PCL5 }
];

const MINI_IPIP_BASE: BaseQuestion[] = [
  { key: 'mini_ipip_q1', text: 'Am the life of the party', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q2', text: 'Talk to a lot of different people at parties', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q3', text: "Don't talk a lot", responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q4', text: 'Keep in the background', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q5', text: "Sympathize with others' feelings", responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q6', text: "Feel others' emotions", responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q7', text: 'Am not really interested in others', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q8', text: 'Insult people', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q9', text: 'Get chores done right away', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q10', text: 'Like order', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q11', text: 'Often forget to put things back in their proper place', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q12', text: 'Make a mess of things', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q13', text: 'Have frequent mood swings', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q14', text: 'Get upset easily', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q15', text: 'Am relaxed most of the time', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q16', text: 'Seldom feel blue', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q17', text: 'Have a vivid imagination', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q18', text: 'Have difficulty understanding abstract ideas', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q19', text: 'Have excellent ideas', responseType: 'scale', options: OPTIONS_MINI_IPIP },
  { key: 'mini_ipip_q20', text: 'Do not have a good imagination', responseType: 'scale', options: OPTIONS_MINI_IPIP }
];

const BROODING_BASE: BaseQuestion[] = [
  { key: 'brooding_q1', text: 'Think "What am I doing to deserve this?"', responseType: 'scale', options: OPTIONS_BROODING },
  { key: 'brooding_q2', text: 'Think "Why do I always react this way?"', responseType: 'scale', options: OPTIONS_BROODING },
  { key: 'brooding_q3', text: 'Think about a recent situation, wishing it had gone better', responseType: 'scale', options: OPTIONS_BROODING },
  { key: 'brooding_q4', text: 'Think "Why do I have problems other people don\'t have?"', responseType: 'scale', options: OPTIONS_BROODING },
  { key: 'brooding_q5', text: 'Think "Why can\'t I handle things better?"', responseType: 'scale', options: OPTIONS_BROODING }
];

const PTQ_BASE: BaseQuestion[] = [
  { key: 'ptq_q1', text: 'The same thoughts keep going through my mind again and again.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q2', text: 'Thoughts intrude into my mind.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q3', text: "I can't stop dwelling on them.", responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q4', text: 'I think about many problems without solving any of them.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q5', text: "I can't do anything else while thinking about my problems.", responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q6', text: 'My thoughts repeat themselves.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q7', text: 'Thoughts come to my mind without me wanting them to.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q8', text: "I get stuck on certain issues and can't move on.", responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q9', text: 'I keep asking myself questions without finding an answer.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q10', text: 'My thoughts prevent me from focusing on other things.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q11', text: 'I keep thinking about the same issue all the time.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q12', text: 'Thoughts just pop into my mind.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q13', text: 'I feel driven to continue dwelling on the same issue.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q14', text: 'My thoughts are not much help to me.', responseType: 'scale', options: OPTIONS_0_TO_4 },
  { key: 'ptq_q15', text: 'My thoughts take up all my attention.', responseType: 'scale', options: OPTIONS_0_TO_4 }
];

const EI10_BASE: BaseQuestion[] = [
  { key: 'ei10_q1', text: 'I know when I am feeling stressed', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q2', text: 'I stay calm even in stressful situations', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q3', text: "I can tell how others are feeling, even if they don't say it directly", responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q4', text: 'I am aware of how my moods affect other people', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q5', text: 'I can motivate myself when I feel discouraged', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q6', text: 'I can cheer myself up when I feel down', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q7', text: "I can sense the emotions behind people's words", responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q8', text: 'I handle conflict with others in a constructive way', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q9', text: 'I can recognize when other people are upset', responseType: 'scale', options: OPTIONS_1_TO_5 },
  { key: 'ei10_q10', text: 'I usually control my emotions when it is necessary', responseType: 'scale', options: OPTIONS_1_TO_5 }
];

const TEIQUE_BASE: BaseQuestion[] = [
  { key: 'teique_q1', text: 'Expressing my emotions with words is not a problem for me.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q2', text: "I often find it difficult to see things from another person's viewpoint.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q3', text: "On the whole, I'm a highly motivated person.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q4', text: "I usually find it difficult to regulate my emotions.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q5', text: "I generally don't find life enjoyable.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q6', text: 'I can deal effectively with people.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q7', text: 'I tend to change my mind frequently.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q8', text: "Many times, I can't figure out what emotion I'm feeling.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q9', text: "I feel that I have a number of good qualities.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q10', text: "I often find it difficult to stand up for my rights.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q11', text: "I'm usually able to influence the way other people feel.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q12', text: "On the whole, I have a gloomy perspective on most things.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q13', text: "Those close to me often complain that I don't treat them right.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q14', text: "I often find it difficult to adjust my life according to the circumstances.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q15', text: "On the whole, I'm able to deal with stress.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q16', text: "I often find it difficult to show my affection to those close to me.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q17', text: "I'm normally able to 'get into someone's shoes' and experience their emotions.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q18', text: "I normally find it difficult to keep myself motivated.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q19', text: "I'm usually able to find ways to control my emotions when I want to.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q20', text: "On the whole, I'm pleased with my life.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q21', text: 'I would describe myself as a good negotiator.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q22', text: "I tend to get involved in things I later wish I could get out of.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q23', text: 'I often pause and think about my feelings.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q24', text: "I believe I'm full of personal strengths.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q25', text: "I tend to 'back down' even if I know I'm right.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q26', text: "I don't seem to have any power at all over other people's feelings.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q27', text: 'I generally believe that things will work out fine in my life.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q28', text: 'I find it difficult to bond well even with those close to me.', responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q29', text: "Generally, I'm able to adapt to new environments.", responseType: 'scale', options: OPTIONS_1_TO_7 },
  { key: 'teique_q30', text: 'Others admire me for being relaxed.', responseType: 'scale', options: OPTIONS_1_TO_7 }
];

function buildCompositeQuestions(sectionSets: BaseQuestion[][]): QuestionSeed[] {
  const composite: QuestionSeed[] = [];
  let currentOrder = 1;

  sectionSets.forEach((section, index) => {
    const prefix = `overall_s${index + 1}`;
    const questions = buildQuestions(section, currentOrder, prefix);
    questions.forEach((question) => {
      composite.push(question);
    });
    currentOrder += section.length;
  });

  return composite;
}

// Scoring configurations for assessments
const GAD7_SCORING = {
  minScore: 0,
  maxScore: 21,
  interpretationBands: [
    { max: 4, label: 'Minimal Anxiety', color: '#10b981' },
    { max: 9, label: 'Mild Anxiety', color: '#fbbf24' },
    { max: 14, label: 'Moderate Anxiety', color: '#f97316' },
    { max: 21, label: 'Severe Anxiety', color: '#ef4444' }
  ]
};

const PHQ9_SCORING = {
  minScore: 0,
  maxScore: 27,
  interpretationBands: [
    { max: 4, label: 'Minimal Depression', color: '#10b981' },
    { max: 9, label: 'Mild Depression', color: '#fbbf24' },
    { max: 14, label: 'Moderate Depression', color: '#f97316' },
    { max: 19, label: 'Moderately Severe Depression', color: '#dc2626' },
    { max: 27, label: 'Severe Depression', color: '#ef4444' }
  ]
};

const PSS10_SCORING = {
  minScore: 0,
  maxScore: 40,
  interpretationBands: [
    { max: 13, label: 'Low Stress', color: '#10b981' },
    { max: 26, label: 'Moderate Stress', color: '#fbbf24' },
    { max: 40, label: 'High Stress', color: '#ef4444' }
  ]
};

const PCL5_SCORING = {
  minScore: 0,
  maxScore: 80,
  interpretationBands: [
    { max: 30, label: 'Minimal PTSD Symptoms', color: '#10b981' },
    { max: 44, label: 'Mild PTSD Symptoms', color: '#fbbf24' },
    { max: 59, label: 'Moderate PTSD Symptoms', color: '#f97316' },
    { max: 80, label: 'Severe PTSD Symptoms', color: '#ef4444' }
  ]
};

const MINI_IPIP_SCORING = {
  minScore: 20,
  maxScore: 100,
  interpretationBands: [
    { max: 40, label: 'Low Trait Expression', color: '#3b82f6' },
    { max: 60, label: 'Moderate Trait Expression', color: '#10b981' },
    { max: 80, label: 'High Trait Expression', color: '#fbbf24' },
    { max: 100, label: 'Very High Trait Expression', color: '#f97316' }
  ]
};

const PTQ_SCORING = {
  minScore: 0,
  maxScore: 60,
  interpretationBands: [
    { max: 20, label: 'Low Rumination', color: '#10b981' },
    { max: 40, label: 'Moderate Rumination', color: '#fbbf24' },
    { max: 60, label: 'High Rumination', color: '#ef4444' }
  ]
};

const TEIQUE_SF_SCORING = {
  minScore: 30,
  maxScore: 210,
  interpretationBands: [
    { max: 90, label: 'Low EQ', color: '#3b82f6' },
    { max: 120, label: 'Below Average EQ', color: '#fbbf24' },
    { max: 150, label: 'Average EQ', color: '#10b981' },
    { max: 180, label: 'Above Average EQ', color: '#22c55e' },
    { max: 210, label: 'High EQ', color: '#059669' }
  ]
};

const BASIC_SCORING = {
  minScore: 0,
  maxScore: 10,
  interpretationBands: [
    { max: 3, label: 'Low', color: '#10b981' },
    { max: 6, label: 'Moderate', color: '#fbbf24' },
    { max: 10, label: 'High', color: '#ef4444' }
  ]
};

const ASSESSMENT_SEEDS: AssessmentSeed[] = [
  // Legacy IDs for backward compatibility with frontend
  {
    id: 'anxiety_assessment',
    name: 'GAD-7 (Anxiety Assessment)',
    type: 'Advanced',
    category: 'Anxiety',
    description: 'Generalized Anxiety Disorder 7-item assessment.',
    timeEstimate: '5 minutes',
    scoringConfig: GAD7_SCORING,
    questions: buildQuestions(GAD7_BASE, 1, 'anxiety_assessment')
  },
  {
    id: 'depression_phq9',
    name: 'PHQ-9 (Depression Assessment)',
    type: 'Advanced',
    category: 'Depression',
    description: 'Patient Health Questionnaire-9 full depression inventory.',
    timeEstimate: '5 minutes',
    scoringConfig: PHQ9_SCORING,
    questions: buildQuestions(PHQ9_BASE, 1, 'depression_phq9')
  },
  {
    id: 'stress_pss10',
    name: 'PSS-10 (Stress Assessment)',
    type: 'Advanced',
    category: 'Stress',
    description: 'Perceived Stress Scale - 10 item standard form.',
    timeEstimate: '6 minutes',
    scoringConfig: PSS10_SCORING,
    questions: buildQuestions(PSS10_BASE, 1, 'stress_pss10')
  },
  {
    id: 'emotional_intelligence_teique',
    name: 'TEIQue-SF (Emotional Intelligence)',
    type: 'Advanced',
    category: 'Emotional Intelligence',
    description: '30-item Trait Emotional Intelligence Questionnaire short form.',
    timeEstimate: '8 minutes',
    scoringConfig: TEIQUE_SF_SCORING,
    questions: buildQuestions(TEIQUE_BASE, 1, 'emotional_intelligence_teique')
  },
  {
    id: 'overthinking_ptq',
    name: 'PTQ (Overthinking Assessment)',
    type: 'Advanced',
    category: 'Overthinking',
    description: '15-item Perseverative Thinking Questionnaire for repetitive negative thinking.',
    timeEstimate: '6 minutes',
    scoringConfig: PTQ_SCORING,
    questions: buildQuestions(PTQ_BASE, 1, 'overthinking_ptq')
  },
  {
    id: 'trauma_pcl5',
    name: 'PCL-5 (Trauma Assessment)',
    type: 'Advanced',
    category: 'Trauma',
    description: 'PTSD Checklist for DSM-5.',
    timeEstimate: '8 minutes',
    scoringConfig: PCL5_SCORING,
    questions: buildQuestions(PCL5_BASE, 1, 'trauma_pcl5')
  },
  {
    id: 'personality_mini_ipip',
    name: 'Mini-IPIP (Personality Assessment)',
    type: 'Advanced',
    category: 'Personality',
    description: '20-item Mini International Personality Item Pool (Big Five traits).',
    timeEstimate: '6 minutes',
    scoringConfig: MINI_IPIP_SCORING,
    questions: buildQuestions(MINI_IPIP_BASE, 1, 'personality_mini_ipip')
  },
  // Modern short-form assessments
  {
    id: 'phq2',
    name: 'PHQ-2',
    type: 'Basic',
    category: 'Depression',
    description: 'Patient Health Questionnaire-2 (two-item depression screener).',
    timeEstimate: '2 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(PHQ2_BASE, 1, 'phq2')
  },
  {
    id: 'gad2',
    name: 'GAD-2',
    type: 'Basic',
    category: 'Anxiety',
    description: 'Generalized Anxiety Disorder 2-item quick screen.',
    timeEstimate: '2 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(GAD2_BASE, 1, 'gad2')
  },
  {
    id: 'pss4',
    name: 'PSS-4',
    type: 'Basic',
    category: 'Stress',
    description: 'Perceived Stress Scale - 4 item short form.',
    timeEstimate: '3 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(PSS4_BASE, 1, 'pss4')
  },
  {
    id: 'rrs4',
    name: 'RRS-4',
    type: 'Basic',
    category: 'Overthinking',
    description: 'Ruminative Response Scale short form.',
    timeEstimate: '3 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(RRS4_BASE, 1, 'rrs4')
  },
  {
    id: 'pc_ptsd_5',
    name: 'PC-PTSD-5',
    type: 'Basic',
    category: 'Trauma',
    description: 'Primary Care PTSD Screen for DSM-5.',
    timeEstimate: '3 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(PCPTSD5_BASE, 1, 'pc_ptsd_5')
  },
  {
    id: 'eq5',
    name: 'EQ-5',
    type: 'Basic',
    category: 'Emotional Intelligence',
    description: 'Short emotional intelligence self-reflection.',
    timeEstimate: '4 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(EQ5_BASE, 1, 'eq5')
  },
  {
    id: 'big_five_short',
    name: 'Big Five Short',
    type: 'Basic',
    category: 'Personality',
    description: 'Mini five-factor personality snapshot.',
    timeEstimate: '4 minutes',
    isBasicOverallOnly: true,
    visibleInMainList: false,
    scoringConfig: BASIC_SCORING,
    questions: buildQuestions(BIG_FIVE_BASE, 1, 'big_five_short')
  }
];

const BASIC_OVERALL_SEED: AssessmentSeed = {
  id: 'basic_overall_assessment',
  name: 'Basic Overall Assessment',
  type: 'Basic',
  category: 'Composite',
  description: 'Combined quick assessment covering depression, anxiety, stress, trauma, rumination, personality, and emotional intelligence.',
  timeEstimate: '10 minutes',
  isBasicOverallOnly: true,
  visibleInMainList: false,
  scoringConfig: {
    minScore: 0,
    maxScore: 50,
    interpretationBands: [
      { max: 15, label: 'Low Overall Distress', color: '#10b981' },
      { max: 30, label: 'Moderate Overall Distress', color: '#fbbf24' },
      { max: 50, label: 'High Overall Distress', color: '#ef4444' }
    ]
  },
  questions: buildCompositeQuestions([
    PHQ2_BASE,
    GAD2_BASE,
    PSS4_BASE,
    RRS4_BASE,
    PCPTSD5_BASE,
    EQ5_BASE,
    BIG_FIVE_BASE
  ])
};

async function seedAssessmentLibrary() {
  const seeds = [...ASSESSMENT_SEEDS, BASIC_OVERALL_SEED];

  await prisma.responseOption.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessmentDefinition.deleteMany();

  for (const seed of seeds) {
    await prisma.assessmentDefinition.create({
      data: {
        id: seed.id,
        name: seed.name,
        type: seed.type,
        category: seed.category,
        description: seed.description,
        timeEstimate: seed.timeEstimate,
        isActive: seed.isActive ?? true,
        isBasicOverallOnly: seed.isBasicOverallOnly ?? false,
        visibleInMainList: seed.visibleInMainList ?? true,
        scoringConfig: seed.scoringConfig ? JSON.stringify(seed.scoringConfig) : null,
        questions: {
          create: seed.questions.map((question) => ({
            id: question.id,
            text: question.text,
            order: question.order,
            responseType: question.responseType,
            options: {
              create: question.options.map((option) => ({
                id: option.id,
                value: option.value,
                text: option.text,
                order: option.order
              }))
            }
          }))
        }
      }
    });
  }
}

type UserProfileInput = Pick<
  User,
  |
    'name'
    | 'firstName'
    | 'lastName'
    | 'profilePhoto'
    | 'approach'
    | 'birthday'
    | 'gender'
    | 'region'
    | 'language'
    | 'emergencyContact'
    | 'emergencyPhone'
    | 'dataConsent'
    | 'clinicianSharing'
    | 'isOnboarded'
>;

async function upsertAdmin(email: string, profile: UserProfileInput) {
  const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialAdminPassword) {
    throw new Error('ADMIN_INITIAL_PASSWORD is required to seed admin users');
  }

  const password = await bcrypt.hash(initialAdminPassword, 10);
  const normalizedEmail = email.toLowerCase();
  const data = {
    ...profile,
    email: normalizedEmail,
    password,
    approach: profile.approach ?? 'western',
    isOnboarded: profile.isOnboarded ?? true,
    dataConsent: profile.dataConsent ?? true,
    clinicianSharing: profile.clinicianSharing ?? false
  } satisfies Partial<User> & { email: string; password: string };

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: data,
    create: data
  });
}

async function upsertDemoUser(
  email: string,
  profile: UserProfileInput,
  options: { password?: string } = {}
) {
  const password = await bcrypt.hash(options.password ?? 'user123', 10);
  const normalizedEmail = email.toLowerCase();
  const data = {
    ...profile,
    email: normalizedEmail,
    password,
    approach: profile.approach ?? 'hybrid',
    isOnboarded: profile.isOnboarded ?? true,
    dataConsent: profile.dataConsent ?? true,
    clinicianSharing: profile.clinicianSharing ?? true
  } satisfies Partial<User> & { email: string; password: string };

  return prisma.user.upsert({
    where: { email: normalizedEmail },
    update: data,
    create: data
  });
}

async function seedPractices() {
  const practiceEntries = [
    {
      title: 'Calm Breathing Intro',
      type: 'breathing',
      duration: 5,
      difficulty: 'Beginner',
      approach: 'Western',
      format: 'Audio',
      description: 'A short guided breathing exercise to reduce tension.',
      audioUrl: 'https://example.com/audio/calm-breathing.mp3',
      videoUrl: null,
      youtubeUrl: null,
      thumbnailUrl: 'https://placehold.co/300x200/breathing',
      tags: 'breathing,relaxation,beginner',
      isPublished: true,
      sourceName: 'Internal curriculum',
      sourceUrl: null,
      confidence: 0.8,
      notes: 'Baseline breath awareness session.'
    },
    {
      title: 'Evening Sleep Preparation',
      type: 'sleep',
      duration: 10,
      difficulty: 'Beginner',
      approach: 'Western',
      format: 'Audio',
      description: 'Wind down with this relaxing pre-sleep audio.',
      audioUrl: 'https://example.com/audio/sleep-prep.mp3',
      videoUrl: null,
      youtubeUrl: null,
      thumbnailUrl: 'https://placehold.co/300x200/sleep',
      tags: 'sleep,relaxation,night',
      isPublished: true,
      sourceName: 'Internal curriculum',
      sourceUrl: null,
      confidence: 0.75,
      notes: 'Pairs well with evening journaling prompts.'
    },
    {
      title: 'Morning Yoga Flow',
      type: 'yoga',
      duration: 15,
      difficulty: 'Intermediate',
      approach: 'Eastern',
      format: 'Video',
      description: 'Activate your body with an energizing flow.',
      audioUrl: null,
      videoUrl: 'https://example.com/video/morning-yoga.mp4',
      youtubeUrl: null,
      thumbnailUrl: 'https://placehold.co/300x200/yoga',
      tags: 'yoga,morning,energy',
      isPublished: true,
      sourceName: 'Internal curriculum',
      sourceUrl: null,
      confidence: 0.7,
      notes: 'Intended as an energizing start to the day.'
    },
    {
      title: '5-Minute Box Breathing Meditation',
      type: 'breathing',
      duration: 5,
      difficulty: 'Beginner',
      approach: 'Hybrid',
      format: 'Video',
      description: 'A simple guided breathing exercise to calm your nervous system and reduce stress.',
      audioUrl: null,
      videoUrl: 'https://www.youtube.com/watch?v=tEmt1Znux58',
      youtubeUrl: 'https://www.youtube.com/watch?v=tEmt1Znux58',
      thumbnailUrl: 'https://i.ytimg.com/vi/tEmt1Znux58/hqdefault.jpg',
      tags: 'anxiety,stress,breathing,box-breathing,calm',
      isPublished: true,
      sourceUrl: 'https://www.youtube.com',
      sourceName: 'Calm',
      confidence: 1,
      notes: 'Classic, effective technique.'
    },
    {
      title: '10-Minute Body Scan for Anxiety Relief',
      type: 'body-scan',
      duration: 10,
      difficulty: 'Beginner',
      approach: 'Eastern',
      format: 'Video',
      description: 'Gently guide your attention through your body to notice sensations without judgment.',
      audioUrl: null,
      videoUrl: 'https://www.youtube.com/watch?v=15291-xd7hA',
      youtubeUrl: 'https://www.youtube.com/watch?v=15291-xd7hA',
      thumbnailUrl: 'https://i.ytimg.com/vi/15291-xd7hA/hqdefault.jpg',
      tags: 'anxiety,stress,body-scan,mindfulness,relaxation',
      isPublished: true,
      sourceUrl: 'https://www.youtube.com',
      sourceName: 'Headspace',
      confidence: 1,
      notes: 'A foundational mindfulness practice.'
    }
  ];

  await prisma.practice.deleteMany();
  await prisma.practice.createMany({ data: practiceEntries });
}

async function seedContent() {
  const entries = [
    {
      title: 'Understanding Anxiety Basics',
      type: 'article',
      category: 'Anxiety',
      approach: 'western',
      content: 'An overview of anxiety: causes, symptoms, and management strategies.',
      description: 'Core concepts about anxiety and how to approach it.',
      difficulty: 'Beginner',
      duration: null,
      youtubeUrl: null,
      thumbnailUrl: null,
      tags: 'anxiety,education,basics',
      isPublished: true,
      sourceName: 'In-app editorial',
      sourceUrl: null,
      confidence: 0.75,
      notes: 'High-level primer created for onboarding.'
    },
    {
      title: 'Guided Body Scan',
      type: 'audio',
      category: 'Relaxation',
      approach: 'hybrid',
      content: 'https://example.com/audio/body-scan.mp3',
      description: 'Full-body awareness practice for grounding and calm.',
      duration: 12,
      difficulty: 'Beginner',
      youtubeUrl: null,
      thumbnailUrl: null,
      tags: 'relaxation,body-scan,mindfulness',
      isPublished: true,
      sourceName: 'In-app editorial',
      sourceUrl: null,
      confidence: 0.7,
      notes: 'Produced for default audio starter pack.'
    },
    {
      title: 'Mindful Minute Video',
      type: 'video',
      category: 'Mindfulness',
      approach: 'western',
      content: 'https://example.com/video/mindful-minute.mp4',
      description: 'A one-minute reset to center your thoughts.',
      duration: 1,
      difficulty: 'Beginner',
      youtubeUrl: null,
      thumbnailUrl: null,
      tags: 'mindfulness,reset,quick',
      isPublished: true,
      sourceName: 'In-app editorial',
      sourceUrl: null,
      confidence: 0.65,
      notes: 'Short clip used in onboarding streaks.'
    },
    {
      title: 'Anxiety Control Toolkit: Techniques to Manage Anxiety',
      type: 'article',
      category: 'anxiety',
      approach: 'western',
      content: 'https://www.psychologytools.com/self-help/anxiety/',
      description: 'Learn practical, evidence-based techniques from cognitive-behavioral therapy (CBT) to manage anxiety symptoms effectively.',
      duration: 12,
      difficulty: 'Beginner',
      youtubeUrl: null,
      thumbnailUrl: null,
      tags: 'anxiety,cbt,cognitive-reframing,thought-record,calm',
      isPublished: true,
      sourceUrl: 'https://www.psychologytools.com',
      sourceName: 'Psychology Tools',
      confidence: 0.95,
      notes: 'Evidence-based CBT guide. Not medical advice.'
    },
    {
      title: 'What is Mindfulness?',
      type: 'article',
      category: 'anxiety',
      approach: 'eastern',
      content: 'https://www.mindful.org/what-is-mindfulness/',
      description: 'An introduction to mindfulness meditation and how it can help reduce stress and anxiety by focusing on the present moment.',
      duration: 5,
      difficulty: 'Beginner',
      youtubeUrl: null,
      thumbnailUrl: null,
      tags: 'anxiety,stress,mindfulness,meditation,calm',
      isPublished: true,
      sourceUrl: 'https://www.mindful.org',
      sourceName: 'Mindful.org',
      confidence: 0.9,
      notes: 'A good primer on the core concepts.'
    }
  ];

  await prisma.content.deleteMany();
  await prisma.content.createMany({ data: entries });
}

async function seedPlanModules() {
  const count = await prisma.planModule.count();
  if (count > 0) return;

  await prisma.planModule.createMany({
    data: [
      {
        title: 'Foundations of Calm',
        type: 'therapy',
        duration: '2 weeks',
        difficulty: 'Beginner',
        description: 'Core grounding skills, breathwork, and journaling prompts to settle anxious thoughts.',
        content: JSON.stringify({
          overview: 'Daily micro-practices for nervous system regulation',
          modules: [
            'Guided diaphragmatic breathing',
            'Body scan awareness audio',
            'Evening reflection journaling'
          ]
        }),
        approach: 'western',
        order: 1
      },
      {
        title: 'Mind-Body Reset',
        type: 'meditation',
        duration: '10 days',
        difficulty: 'Intermediate',
        description: 'Somatic release paired with mindful reframing exercises.',
        content: JSON.stringify({
          overview: 'Blend of gentle movement and thought reframing',
          modules: [
            'Progressive muscle relaxation',
            'Cognitive reframing worksheets',
            'Guided visualization for safety'
          ]
        }),
        approach: 'hybrid',
        order: 2
      },
      {
        title: 'Confidence in Action',
        type: 'coaching',
        duration: '3 weeks',
        difficulty: 'Advanced',
        description: 'Gradual exposure roadmap with community accountability touchpoints.',
        content: JSON.stringify({
          overview: 'Build momentum through small experiments',
          modules: [
            'Values-based goal setting',
            'Exposure ladder planning',
            'Weekly reflection templates'
          ]
        }),
        approach: 'hybrid',
        order: 3
      }
    ]
  });
}

async function assignPlanModulesToUser(userId: string) {
  const existingAssignments = await prisma.userPlanModule.count({ where: { userId } });
  if (existingAssignments > 0) return;

  const modules = await prisma.planModule.findMany({ orderBy: { order: 'asc' } });
  const scheduled = new Date();

  await Promise.all(
    modules.map((module, index) =>
      prisma.userPlanModule.upsert({
        where: {
          userId_moduleId: {
            userId,
            moduleId: module.id
          }
        },
        update: {
          progress: index === 0 ? 100 : 20,
          completed: index === 0,
          completedAt: index === 0 ? new Date(scheduled.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
          scheduledFor: new Date(scheduled.getTime() + index * 24 * 60 * 60 * 1000),
          notes: index === 0 ? 'Completed during onboarding walkthrough.' : 'Queued for upcoming week.'
        },
        create: {
          userId,
          moduleId: module.id,
          progress: index === 0 ? 100 : 20,
          completed: index === 0,
          completedAt: index === 0 ? new Date(scheduled.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
          scheduledFor: new Date(scheduled.getTime() + index * 24 * 60 * 60 * 1000),
          notes: index === 0 ? 'Completed during onboarding walkthrough.' : 'Queued for upcoming week.'
        }
      })
    )
  );
}

async function seedMoodEntriesForUser(userId: string) {
  const existing = await prisma.moodEntry.count({ where: { userId } });
  if (existing > 0) return;

  const today = new Date();
  const entries = [
    {
      userId,
      mood: 'Good',
      notes: 'Morning breathing practice helped me feel grounded.',
      createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      userId,
      mood: 'Great',
      notes: 'Completed confidence exercise and felt proud.',
      createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      userId,
      mood: 'Okay',
      notes: 'Slept late but used body scan to unwind before bed.',
      createdAt: today
    }
  ];

  await prisma.moodEntry.createMany({ data: entries });
}

async function seedProgressTrackingForUser(userId: string) {
  const existing = await prisma.progressTracking.count({ where: { userId } });
  if (existing > 0) return;

  const today = new Date();
  await prisma.progressTracking.createMany({
    data: [
      {
        userId,
        metric: 'anxiety',
        value: 62,
        date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        notes: 'Baseline intake measurement.'
      },
      {
        userId,
        metric: 'anxiety',
        value: 55,
        date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
        notes: 'After consistent breathwork routines.'
      },
      {
        userId,
        metric: 'sleep',
        value: 7.5,
        date: today,
        notes: 'Average hours of sleep this week.'
      }
    ]
  });
}

async function seedAssessmentsForUser(userId: string) {
  const existing = await prisma.assessmentResult.count({ where: { userId } });
  if (existing > 0) return;

  const now = new Date();
  const responseTemplate = (values: number[]) =>
    JSON.stringify(
      values.reduce<Record<string, number>>((acc, value, index) => {
        acc[`q${String(index + 1).padStart(2, '0')}`] = value;
        return acc;
      }, {})
    );

  await prisma.assessmentResult.createMany({
    data: [
      {
        userId,
        assessmentType: 'anxiety_assessment',
        score: 68,
        responses: responseTemplate([3, 4, 2, 5, 4, 3, 4, 3, 2, 4, 3, 4, 2, 3, 4, 3, 2, 3, 4, 3]),
        rawScore: 54,
        maxScore: 80,
        normalizedScore: 68,
        categoryScores: {
          cognitive: { raw: 18, normalized: 72, interpretation: 'Racing thoughts show improvement with practice.' },
          physical: { raw: 20, normalized: 67, interpretation: 'Body tension easing with daily breathing sets.' },
          behavioral: { raw: 16, normalized: 64, interpretation: 'Avoidance decreasing as confidence builds.' }
        },
        completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        userId,
        assessmentType: 'stress',
        score: 42,
        responses: responseTemplate([2, 3, 3, 2, 4, 2, 3]),
        rawScore: 21,
        maxScore: 50,
        normalizedScore: 42,
        categoryScores: {
          workload: { raw: 7, normalized: 35, interpretation: 'Workload manageable with current routines.' },
          resilience: { raw: 8, normalized: 40, interpretation: 'Steady resilience—celebrate wins.' },
          recovery: { raw: 6, normalized: 60, interpretation: 'Recovery practices supporting balance.' }
        },
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        userId,
        assessmentType: 'overthinking',
        score: 38,
        responses: responseTemplate([1, 2, 2, 3, 2, 1, 2, 3]),
        rawScore: 19,
        maxScore: 60,
        normalizedScore: 32,
        categoryScores: {
          rumination: { raw: 7, normalized: 35, interpretation: 'Rumination easing with nightly journaling.' },
          selfCompassion: { raw: 6, normalized: 60, interpretation: 'Self-talk becoming more supportive.' },
          clarity: { raw: 6, normalized: 30, interpretation: 'Maintaining mental clarity through routines.' }
        },
        completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }
    ]
  });
}

async function seedAssessmentInsightForUser(userId: string) {
  const existing = await prisma.assessmentInsight.findUnique({ where: { userId } });
  if (existing) return;

  const updatedAt = new Date();
  const summaryPayload = {
    history: [],
    insights: {
      byType: {
        anxiety_assessment: {
          latestScore: 68,
          previousScore: 74,
          change: -6,
          averageScore: 70,
          bestScore: 74,
          trend: 'improving',
          interpretation: 'Anxiety steadily trending downward thanks to consistent grounding rituals.',
          recommendations: [
            'Keep practicing guided diaphragmatic breathing twice a day.',
            'Schedule one confidence-building exposure this week.'
          ],
          lastCompletedAt: new Date(updatedAt.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          historyCount: 3,
          normalizedScore: 68,
          rawScore: 54,
          maxScore: 80,
          categoryBreakdown: {
            cognitive: {
              raw: 18,
              normalized: 72,
              interpretation: 'Racing thoughts are settling with consistent journaling.'
            },
            physical: {
              raw: 20,
              normalized: 67,
              interpretation: 'Body tension easing through mindful movement routines.'
            },
            behavioral: {
              raw: 16,
              normalized: 64,
              interpretation: 'Avoidance reducing as confidence increases.'
            }
          }
        }
      },
      aiSummary:
        'Your nervous system is recalibrating. Keep stacking the calming micro-habits—breathing resets, movement, and reframing—they are paying off. Consider adding a gratitude wrap-up at night to lock in progress.',
      overallTrend: 'improving',
      wellnessScore: {
        value: 76,
        method: 'advanced-average',
        updatedAt: updatedAt.toISOString()
      },
      updatedAt: updatedAt.toISOString()
    }
  };

  await prisma.assessmentInsight.create({
    data: {
      userId,
      summary: summaryPayload,
      overallTrend: 'improving',
      aiSummary: summaryPayload.insights.aiSummary,
      wellnessScore: summaryPayload.insights.wellnessScore?.value ?? 0,
      updatedAt,
      createdAt: updatedAt
    }
  });
}

async function main() {
  console.log('🌱 Seeding database...');
  await seedAssessmentLibrary();
  const admin = await upsertAdmin('admin@example.com', {
    name: 'Jordan Taylor',
    firstName: 'Jordan',
    lastName: 'Taylor',
    profilePhoto: 'https://avatars.githubusercontent.com/u/1?v=4',
    approach: 'western',
    birthday: new Date('1985-03-18'),
    gender: 'female',
    region: 'North America',
    language: 'en-US',
    emergencyContact: 'Alex Taylor',
    emergencyPhone: '+1-555-201-3478',
    dataConsent: true,
    clinicianSharing: true,
    isOnboarded: true
  });

  await upsertAdmin('admin@mentalwellbeing.ai', {
    name: 'Morgan Lee',
    firstName: 'Morgan',
    lastName: 'Lee',
    profilePhoto: 'https://avatars.githubusercontent.com/u/2?v=4',
    approach: 'hybrid',
    birthday: new Date('1990-11-05'),
    gender: 'male',
    region: 'Asia-Pacific',
    language: 'en-SG',
    emergencyContact: 'Jamie Lee',
    emergencyPhone: '+65-5550-1122',
    dataConsent: true,
    clinicianSharing: false,
    isOnboarded: true
  });

  const demoUser1 = await upsertDemoUser('user1@example.com', {
    name: 'Avery Johnson',
    firstName: 'Avery',
    lastName: 'Johnson',
    profilePhoto: 'https://placehold.co/200x200/avery',
    approach: 'eastern',
    birthday: new Date('1994-07-22'),
    gender: 'non-binary',
    region: 'Europe',
    language: 'en-GB',
    emergencyContact: 'Sam Johnson',
    emergencyPhone: '+44-20-5550-8899',
    dataConsent: true,
    clinicianSharing: true,
    isOnboarded: true
  });

  const demoUser2 = await upsertDemoUser('testuser@example.com', {
    name: 'Priya Patel',
    firstName: 'Priya',
    lastName: 'Patel',
    profilePhoto: 'https://placehold.co/200x200/priya',
    approach: 'hybrid',
    birthday: new Date('1998-02-09'),
    gender: 'female',
    region: 'South Asia',
    language: 'en-IN',
    emergencyContact: 'Rohan Patel',
    emergencyPhone: '+91-98765-43210',
    dataConsent: true,
    clinicianSharing: false,
    isOnboarded: true
  });
  await seedPractices();
  await seedContent();
  await seedPlanModules();
  await assignPlanModulesToUser(demoUser1.id);
  await assignPlanModulesToUser(demoUser2.id);
  await seedMoodEntriesForUser(demoUser1.id);
  await seedMoodEntriesForUser(demoUser2.id);
  await seedProgressTrackingForUser(demoUser1.id);
  await seedProgressTrackingForUser(demoUser2.id);
  await seedAssessmentsForUser(demoUser1.id);
  await seedAssessmentsForUser(demoUser2.id);
  await seedAssessmentInsightForUser(demoUser1.id);
  await seedAssessmentInsightForUser(demoUser2.id);
  console.log('✅ Admin users:', admin.email, 'and secondary admin ensured');
  console.log('👤 Demo users:', demoUser1.email, 'and', demoUser2.email, 'available');
  console.log('🌱 Seed complete');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
