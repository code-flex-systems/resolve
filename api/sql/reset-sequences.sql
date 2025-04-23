-- Reset serial for checklist
SELECT setval(
  pg_get_serial_sequence('checklist','id'),
  COALESCE((SELECT MAX(id) FROM checklist), 0) + 1,
  false
);

-- Reset serial for claim
SELECT setval(
  pg_get_serial_sequence('claim','id'),
  COALESCE((SELECT MAX(id) FROM claim), 0) + 1,
  false
);

-- Reset serial for page
SELECT setval(
  pg_get_serial_sequence('page','id'),
  COALESCE((SELECT MAX(id) FROM page), 0) + 1,
  false
);

-- Reset serial for page_instance
SELECT setval(
  pg_get_serial_sequence('page_instance','id'),
  COALESCE((SELECT MAX(id) FROM page_instance), 0) + 1,
  false
);

-- Reset serial for doc
SELECT setval(
  pg_get_serial_sequence('doc','id'),
  COALESCE((SELECT MAX(id) FROM doc), 0) + 1,
  false
);

-- Reset serial for question
SELECT setval(
  pg_get_serial_sequence('question','id'),
  COALESCE((SELECT MAX(id) FROM question), 0) + 1,
  false
);

-- Reset serial for answer
SELECT setval(
  pg_get_serial_sequence('answer','id'),
  COALESCE((SELECT MAX(id) FROM answer), 0) + 1,
  false
);

-- Reset serial for question_response
SELECT setval(
  pg_get_serial_sequence('question_response','id'),
  COALESCE((SELECT MAX(id) FROM question_response), 0) + 1,
  false
);

-- Reset serial for question_response_answer
SELECT setval(
  pg_get_serial_sequence('question_response_answer','id'),
  COALESCE((SELECT MAX(id) FROM question_response_answer), 0) + 1,
  false
);
