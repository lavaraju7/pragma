import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classify, nudgeFor } from '../hooks/lib/intent.js';

describe('intent classification', () => {
  it('recognises debugging', () => {
    assert.equal(classify('the checkout endpoint is failing with a 500'), 'debug');
    assert.equal(classify('why is getUser returning null here?'), 'debug');
    assert.equal(classify("this doesn't work after the upgrade"), 'debug');
  });

  it('recognises refactoring', () => {
    assert.equal(classify('can you clean up the order service'), 'refactor');
    assert.equal(classify('extract this into smaller functions'), 'refactor');
  });

  it('recognises design work', () => {
    assert.equal(classify('implement a retry policy for the webhook sender'), 'design');
    assert.equal(classify('add a new endpoint for cancellations'), 'design');
  });

  it('prefers debugging when a prompt mentions both', () => {
    assert.equal(classify('the new endpoint I want to build is throwing an error'), 'debug');
  });

  it('does not read "add error handling" as a bug report', () => {
    assert.notEqual(classify('add error handling to the webhook sender'), 'debug');
  });

  it('stays silent on prompts with no clear intent', () => {
    assert.equal(classify('what does this function do?'), undefined);
    assert.equal(classify('add a comment explaining the regex'), undefined);
    assert.equal(classify('run the tests'), undefined);
    assert.equal(classify('thanks, that looks right'), undefined);
    assert.equal(classify(''), undefined);
    assert.equal(classify(undefined), undefined);
  });
});

describe('nudge text', () => {
  it('is empty when there is no intent', () => {
    assert.equal(nudgeFor('run the tests'), '');
  });

  it('points at the matching skill and stays short', () => {
    const nudge = nudgeFor('the payment webhook is crashing');
    assert.match(nudge, /\/pragma:debug/);
    assert.ok(nudge.split('\n').length <= 8, 'nudge should stay under eight lines');
  });
});
