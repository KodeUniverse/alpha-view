FEATURE: PORTFOLIO TRACKING PAGE, AND ANALYSIS OF PERFORMANCE. AS WELL AS PORTFOLIO SIM (same page) ?  

My example:

 - ~~I have a net-worth graph from my broker.~~ It seems like many brokers don't have great csv export options. and this is manual. 
 - Instead, I need to implement manual portfolio tracking, user enters their positions, historical transactions too if they want. And the portfolio is tracked.
 - And I will also offer the option for OAuth based connection to brokers for auto-tracking. Charles Schwab offers this, as well as some others.

The feature:
 - I need to know why my net-worth fell in a certain time, and why it rised, and why at times it went from linear to parabolic. 
 - Once the AI figures out what positions are driving the changes and increases, it can then check news to see if it was driven by news events. (or just call a skill for analyzing why a stock moved)
 - Backtesting for a test portfolio. Optimizing for a certain sharpe, exposure to sector, etc..

TODO:
 - implement manual portfolio tracking.
 - Get the input data. Net-worth graph, or more simply a performance graph for a broker account. and then position level data, and performance per ticker (maybe this can be collected with Alpaca API)
 - Write deterministic logic for determining the drivers of performance.
 - Wire up an LLM
 - Present the drivers of performance to the AI, and have it run the analysis of what happened.
