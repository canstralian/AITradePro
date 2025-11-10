#!/usr/bin/env python3
"""MCP Backtesting Server Entry Point."""

import asyncio
import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from mcp_server.server import create_backtesting_server
from config.settings import settings
from utils.logger import logger


async def main() -> None:
    """Start the MCP backtesting server."""
    logger.info(
        "Starting AITradePro MCP Backtesting Server",
        version=settings.server_version,
        server_name=settings.server_name,
    )

    try:
        server = await create_backtesting_server()

        # Run server with stdio transport
        from mcp.server.stdio import stdio_server

        async with stdio_server() as (read_stream, write_stream):
            logger.info("MCP server listening on stdio")
            await server.run(
                read_stream, write_stream, server.create_initialization_options()
            )

    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error("Server error", error=str(e), exc_info=True)
        sys.exit(1)
    finally:
        logger.info("MCP Backtesting Server stopped")


if __name__ == "__main__":
    asyncio.run(main())
